import json
from database.connection import get_db_connection
from datetime import datetime
from zoneinfo import ZoneInfo
from utils.timezone_utils import get_ist_now
from utils.phone_utils import clean_phone_number

import threading


def _offload_inbound_media(message: dict):
    """Best-effort: download inbound media once and store it in GCS.

    Runs in a daemon thread so it never blocks the webhook response and works
    from either /webhook route. Safe no-op when GCS isn't configured.
    """
    media = (message.get("image") or message.get("video")
             or message.get("audio") or message.get("document"))
    if not media or not media.get("id"):
        return

    def _work():
        try:
            from services.whatsapp_service import WhatsAppService
            data, _ = WhatsAppService.fetch_media(media["id"])
            WhatsAppService.store_inbound_media(media["id"], data, media.get("mime_type"))
        except Exception as exc:
            print(f"Inbound media offload skipped for {media.get('id')}: {exc}")

    threading.Thread(target=_work, daemon=True).start()


class WebhookService:
    @staticmethod
    def process_event(data: dict):
        """Parse Meta webhook payload and route to specific handlers."""
        # Check if it's a WhatsApp message notification
        if data.get("object") != "whatsapp_business_account":
            return {"status": "ignored", "reason": "not_whatsapp_object"}

        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # Handle Status Updates (sent, delivered, read)
                if "statuses" in value:
                    for status_update in value["statuses"]:
                        WebhookService._handle_status_update(status_update)
                
                # Handle Incoming Messages
                if "messages" in value:
                    for message in value["messages"]:
                        WebhookService._handle_incoming_message(message, value.get("contacts", []))

        return {"status": "success"}

    @staticmethod
    def _handle_status_update(update: dict):
        """Update message status in database."""
        meta_id = update.get("id")
        status = update.get("status") # 'delivered', 'read', 'sent', 'failed'
        # Convert Meta UTC timestamp to IST
        timestamp = datetime.fromtimestamp(int(update.get("timestamp")), tz=ZoneInfo("UTC")).astimezone(ZoneInfo("Asia/Kolkata"))
        
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                if status == "delivered":
                    cur.execute(
                        "UPDATE whatsapp_messages SET status = %s, delivered_at = %s WHERE meta_message_id = %s",
                        (status, timestamp, meta_id)
                    )
                elif status == "read":
                    cur.execute(
                        "UPDATE whatsapp_messages SET status = %s, read_at = %s WHERE meta_message_id = %s",
                        (status, timestamp, meta_id)
                    )
                elif status == "failed":
                    # Meta puts the delivery-failure reason in `errors` (code +
                    # title + details). Persist it so the UI/report can show WHY
                    # a template failed (e.g. 131049 marketing frequency cap,
                    # 131026 undeliverable, 130472 experiment) instead of a bare
                    # "failed" with no explanation.
                    errors = update.get("errors") or []
                    cur.execute(
                        "UPDATE whatsapp_messages SET status = %s, payload = %s WHERE meta_message_id = %s",
                        (status, json.dumps({"errors": errors, "status_update": update}), meta_id)
                    )
                else:
                    cur.execute(
                        "UPDATE whatsapp_messages SET status = %s WHERE meta_message_id = %s",
                        (status, meta_id)
                    )

                # If part of a campaign, update campaign counters
                cur.execute(
                    """
                    UPDATE whatsapp_campaigns 
                    SET delivered_count = (SELECT count(*) FROM whatsapp_messages WHERE campaign_id = whatsapp_campaigns.id AND status IN ('delivered', 'read')),
                        read_count = (SELECT count(*) FROM whatsapp_messages WHERE campaign_id = whatsapp_campaigns.id AND status = 'read')
                    WHERE id = (SELECT campaign_id FROM whatsapp_messages WHERE meta_message_id = %s)
                    """,
                    (meta_id,)
                )
                
                conn.commit()
            except Exception as e:
                print(f"Error updating status: {str(e)}")
                conn.rollback()
            finally:
                cur.close()

    @staticmethod
    def _handle_incoming_message(message: dict, contacts: list):
        """Save inbound message and link to prospect.

        Also captures two things Meta sends that we previously dropped:
          - contacts[].profile.name : the sender's WhatsApp display name, so
            new contacts show a real name instead of "WhatsApp Contact".
          - message.referral        : the Click-to-WhatsApp (CTWA) ad object
            present on the first message after an ad click, so ad leads are
            identifiable in the inbox.
        The message's real `timestamp` is used for created_at so the inbox
        orders correctly even under out-of-order / retried webhooks.
        """
        from_mobile = clean_phone_number(message.get("from")) # Format: 10 digits
        meta_id = message.get("id")
        msg_type = message.get("type")
        body = ""

        # Sender's WhatsApp profile name (match by wa_id, else first contact).
        profile_name = None
        for c in (contacts or []):
            wa_id = str(c.get("wa_id", ""))
            if from_mobile and wa_id.endswith(from_mobile[-10:]):
                profile_name = (c.get("profile") or {}).get("name")
                break
        if not profile_name and contacts:
            profile_name = (contacts[0].get("profile") or {}).get("name")
        profile_name = (profile_name or "").strip() or None

        # Click-to-WhatsApp ad referral (only on the first post-click message).
        referral = message.get("referral") or None
        is_ad = referral is not None

        # Prefer the message's real timestamp over insert time for ordering.
        created_at = get_ist_now()
        ts = message.get("timestamp")
        if ts:
            try:
                created_at = datetime.fromtimestamp(int(ts), tz=ZoneInfo("UTC")).astimezone(ZoneInfo("Asia/Kolkata"))
            except Exception:
                pass
        
        if msg_type == "text":
            body = message.get("text", {}).get("body", "")
        elif msg_type == "button":
            body = message.get("button", {}).get("text", "")
        elif msg_type == "interactive":
            interactive = message.get("interactive", {})
            if interactive.get("type") == "button_reply":
                body = interactive.get("button_reply", {}).get("title", "")
            elif interactive.get("type") == "list_reply":
                body = interactive.get("list_reply", {}).get("title", "")
            elif interactive.get("type") == "nfm_reply":
                nfm_reply = interactive.get("nfm_reply", {})
                response_json_str = nfm_reply.get("response_json", "{}")
                try:
                    flow_data = json.loads(response_json_str)
                    summary_parts = []
                    if "full_name" in flow_data:
                        summary_parts.append(f"Name: {flow_data['full_name']}")
                    if "degree" in flow_data:
                        summary_parts.append(f"Degree: {flow_data['degree']}")
                    if "confirmed" in flow_data:
                        summary_parts.append(f"Confirmed: {flow_data['confirmed']}")
                    
                    if summary_parts:
                        body = "Form: " + ", ".join(summary_parts)
                    else:
                        body = "Form Submitted"
                except Exception:
                    body = "Form Submitted"
        elif msg_type == "document":
            doc = message.get("document", {})
            filename = doc.get("filename", "document")
            body = f"[Document] {filename}"
        elif msg_type == "image":
            image = message.get("image", {})
            caption = image.get("caption")
            body = f"[Image] {caption}" if caption else "[Image]"
        elif msg_type == "video":
            video = message.get("video", {})
            caption = video.get("caption")
            body = f"[Video] {caption}" if caption else "[Video]"
        elif msg_type == "audio":
            body = "[Voice Message]"

        # Offload inbound media (voice note / image / video / doc) to GCS once,
        # so it's later served via signed URL instead of proxied out of Cloud Run
        # (this removes the egress cost). Best-effort + background thread so the
        # webhook still returns 200 promptly.
        if msg_type in ("image", "video", "audio", "document"):
            _offload_inbound_media(message)

        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                now = get_ist_now()
                # 1. Find prospect by mobile
                # WhatsApp mobile might have 91 prefix, database might not, or vice versa
                # We'll try to match the last 10 digits
                cur.execute(
                    "SELECT id FROM prospects WHERE mobile LIKE %s",
                    (f"%{from_mobile[-10:]}",)
                )
                prospect = cur.fetchone()

                if not prospect:
                    # Auto-create a contact — use the real WhatsApp name and flag
                    # ad leads with sourced_from/lead_source.
                    new_name = profile_name or "WhatsApp Contact"
                    cur.execute(
                        """
                        INSERT INTO prospects (name, mobile, status, sourced_from, lead_source, created_at, updated_at)
                        VALUES (%s, %s, 'new', %s, %s, %s, %s) RETURNING id
                        """,
                        (
                            new_name,
                            from_mobile,
                            'facebook_ad' if is_ad else None,
                            json.dumps(['facebook_ad']) if is_ad else '[]',
                            now,
                            now,
                        )
                    )
                    prospect_id = cur.fetchone()[0]
                else:
                    prospect_id = prospect[0]
                    # Backfill the real name over the generic placeholder (never
                    # clobber a name a human/import already set), and stamp the ad
                    # source if this is a CTWA lead.
                    if profile_name:
                        cur.execute(
                            """
                            UPDATE prospects
                            SET name = CASE WHEN name IS NULL OR name = '' OR name = 'WhatsApp Contact'
                                            THEN %s ELSE name END,
                                sourced_from = CASE WHEN %s THEN COALESCE(sourced_from, 'facebook_ad') ELSE sourced_from END
                            WHERE id = %s
                            """,
                            (profile_name, is_ad, prospect_id)
                        )
                    elif is_ad:
                        cur.execute(
                            "UPDATE prospects SET sourced_from = COALESCE(sourced_from, 'facebook_ad') WHERE id = %s",
                            (prospect_id,)
                        )

                # 2. Find last campaign_id to keep context (optional but good for tracking)
                cur.execute(
                    "SELECT campaign_id FROM whatsapp_messages WHERE prospect_id = %s AND campaign_id IS NOT NULL ORDER BY created_at DESC LIMIT 1",
                    (prospect_id,)
                )
                last_campaign = cur.fetchone()
                campaign_id = last_campaign[0] if last_campaign else None

                # 3. Save Message (raw payload keeps the full referral object for
                # the inbox's ad detection; created_at uses the real msg time).
                cur.execute(
                    """
                    INSERT INTO whatsapp_messages (prospect_id, campaign_id, meta_message_id, direction, message_type, status, body, payload, created_at)
                    VALUES (%s, %s, %s, %s, %s, 'delivered', %s, %s, %s)
                    """,
                    (prospect_id, campaign_id, meta_id, 'inbound', msg_type, body, json.dumps(message), created_at)
                )
                conn.commit()
            except Exception as e:
                print(f"Error handling incoming message: {str(e)}")
                conn.rollback()
            finally:
                cur.close()
