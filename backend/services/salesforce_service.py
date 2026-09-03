"""
salesforce_service.py — bridge to the TATTI CRM Salesforce org.

Two capabilities:
  1. list_email_templates() — OAuth (client-credentials) token against the org,
     then a SOQL query on EmailTemplate via the REST Data API. Returns
     [{"id", "name", "subject"}] for the caller's template picker.
       GET {instance_url}/services/data/{ver}/query?q=SELECT Id, Name, Subject …
           FROM EmailTemplate WHERE IsActive = true
     NOTE: the External Client App's client-credentials "Run As" user must be a
     full user (salesforce@tatti.com). The API-only integration license cannot
     see EmailTemplate and Salesforce returns INVALID_TYPE — surfaced clearly.
  2. send_email(prospect_ids, template_id) — resolve each prospect's Salesforce
     Lead Id (prospects.lead_id, the 00Q… value) and POST the lead-event payload
        {"event": "Send email", "emailTemplateId": "00X…", "leadIds": [...]}
     to the public Site Apex REST endpoint (no auth). Prospects without a lead_id
     are reported as "skipped" rather than silently dropped.

If SALESFORCE_TEMPLATES_URL is set it overrides the OAuth path (a plain GET that
already returns a list). If OAuth creds are absent, templates come back empty and
the UI offers "default email (no template)".
"""
import html
import json
import logging
import re
import threading
import time
from typing import Any, Dict, List, Optional

import httpx

from config import Settings
from database.connection import get_db_connection

logger = logging.getLogger(__name__)
settings = Settings()

# Module-level access-token cache (client-credentials tokens are org-wide, not
# per-user, so one cached token serves every request until it nears expiry).
_token_lock = threading.Lock()
_token_cache: Dict[str, Any] = {"access_token": None, "instance_url": None, "expires_at": 0.0}


class SalesforceService:
    # ── OAuth ────────────────────────────────────────────────────────────────
    @staticmethod
    def _get_access_token(force_refresh: bool = False) -> Dict[str, str]:
        """Return a cached {access_token, instance_url}, refreshing when stale."""
        client_id = (settings.SALESFORCE_CLIENT_ID or "").strip()
        client_secret = (settings.SALESFORCE_CLIENT_SECRET or "").strip()
        if not client_id or not client_secret:
            raise RuntimeError(
                "Salesforce OAuth is not configured — set SALESFORCE_CLIENT_ID and "
                "SALESFORCE_CLIENT_SECRET in the backend environment."
            )

        with _token_lock:
            now = time.time()
            if (
                not force_refresh
                and _token_cache["access_token"]
                and now < _token_cache["expires_at"]
            ):
                return {
                    "access_token": _token_cache["access_token"],
                    "instance_url": _token_cache["instance_url"],
                }

            token_url = f"{settings.SALESFORCE_LOGIN_URL.rstrip('/')}/services/oauth2/token"
            try:
                with httpx.Client(timeout=settings.SALESFORCE_TIMEOUT) as client:
                    resp = client.post(
                        token_url,
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                        data={
                            "grant_type": "client_credentials",
                            "client_id": client_id,
                            "client_secret": client_secret,
                        },
                    )
            except Exception as exc:
                logger.error("Salesforce token request failed: %s", exc)
                raise RuntimeError(f"Salesforce auth request failed: {exc}")

            if resp.status_code != 200:
                raise RuntimeError(
                    f"Salesforce auth failed ({resp.status_code}): {resp.text}"
                )
            data = resp.json()
            access_token = data.get("access_token")
            instance_url = data.get("instance_url") or settings.SALESFORCE_LOGIN_URL
            if not access_token:
                raise RuntimeError(f"Salesforce auth returned no access_token: {data}")

            # client-credentials responses usually omit expires_in; cache ~1h and
            # rely on the 401-retry path if the org uses a shorter session.
            _token_cache.update(
                access_token=access_token,
                instance_url=instance_url.rstrip("/"),
                expires_at=now + 3300,  # 55 minutes
            )
            return {"access_token": access_token, "instance_url": _token_cache["instance_url"]}

    # ── Templates ────────────────────────────────────────────────────────────
    @staticmethod
    def list_email_templates() -> List[Dict[str, Any]]:
        """Return [{"id", "name", "subject"}] for the caller's template picker."""
        # Legacy override: a plain GET that already returns a list.
        override_url = (settings.SALESFORCE_TEMPLATES_URL or "").strip()
        if override_url:
            return SalesforceService._list_via_plain_url(override_url)

        # No OAuth creds → let the UI fall back to "default email".
        if not (settings.SALESFORCE_CLIENT_ID and settings.SALESFORCE_CLIENT_SECRET):
            return []

        soql = (
            "SELECT Id, Name, DeveloperName, Subject, TemplateType, UiType, "
            "FolderName, IsActive FROM EmailTemplate WHERE IsActive = true "
            "ORDER BY Name LIMIT 200"
        )
        data = SalesforceService._query(soql)
        records = data.get("records", []) if isinstance(data, dict) else []
        templates: List[Dict[str, Any]] = []
        for r in records:
            tid = r.get("Id")
            if not tid:
                continue
            templates.append({
                "id": str(tid),
                "name": str(r.get("Name") or r.get("DeveloperName") or tid),
                "subject": r.get("Subject") or "",
                "folder": r.get("FolderName") or "",
            })
        return templates

    @staticmethod
    def _query(soql: str) -> Dict[str, Any]:
        """Run a SOQL query via the REST Data API, refreshing the token on 401."""
        def _do(token: Dict[str, str]) -> httpx.Response:
            url = (
                f"{token['instance_url']}/services/data/"
                f"{settings.SALESFORCE_API_VERSION}/query"
            )
            with httpx.Client(timeout=settings.SALESFORCE_TIMEOUT) as client:
                return client.get(
                    url,
                    params={"q": soql},
                    headers={"Authorization": f"Bearer {token['access_token']}"},
                )

        token = SalesforceService._get_access_token()
        resp = _do(token)
        if resp.status_code == 401:  # token expired/revoked → refresh once
            token = SalesforceService._get_access_token(force_refresh=True)
            resp = _do(token)

        if resp.status_code == 200:
            return resp.json()

        body = resp.text
        if "INVALID_TYPE" in body or "EmailTemplate' is not supported" in body:
            raise RuntimeError(
                "Salesforce can't read EmailTemplate with the current integration "
                "user. In Setup → External Client App 'TattiCrm' → OAuth Policies → "
                "Client Credentials Flow, set Run As = salesforce@tatti.com (a full "
                "user), save, and it will work. (Salesforce: INVALID_TYPE)"
            )
        raise RuntimeError(f"Salesforce query failed ({resp.status_code}): {body}")

    @staticmethod
    def _list_via_plain_url(url: str) -> List[Dict[str, Any]]:
        """Legacy path: a plain GET returning a template list."""
        try:
            with httpx.Client(timeout=settings.SALESFORCE_TIMEOUT) as client:
                resp = client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            raise RuntimeError(f"Could not load Salesforce templates: {exc}")
        if isinstance(data, dict):
            for key in ("templates", "data", "records", "items"):
                if isinstance(data.get(key), list):
                    data = data[key]
                    break
        out: List[Dict[str, Any]] = []
        if isinstance(data, list):
            for row in data:
                if isinstance(row, dict):
                    tid = row.get("id") or row.get("Id")
                    if tid:
                        out.append({
                            "id": str(tid),
                            "name": str(row.get("name") or row.get("Name") or tid),
                            "subject": row.get("subject") or row.get("Subject") or "",
                        })
        return out

    # ── Lead-id resolution ───────────────────────────────────────────────────
    @staticmethod
    def _resolve_lead_ids(prospect_ids: List[int]) -> Dict[str, Any]:
        """Map prospect ids -> their Salesforce lead_id, splitting missing ones."""
        if not prospect_ids:
            return {"resolved": [], "skipped": []}
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute(
                    "SELECT id, name, lead_id FROM prospects WHERE id = ANY(%s)",
                    (prospect_ids,),
                )
                rows = cur.fetchall()
            finally:
                cur.close()

        resolved: List[Dict[str, Any]] = []
        skipped: List[Dict[str, Any]] = []
        found_ids = set()
        for p_id, name, lead_id in rows:
            found_ids.add(p_id)
            lid = (lead_id or "").strip() if isinstance(lead_id, str) else lead_id
            if lid:
                resolved.append({"prospect_id": p_id, "name": name, "lead_id": str(lid)})
            else:
                skipped.append({"prospect_id": p_id, "name": name, "reason": "No Salesforce Lead Id"})
        for p_id in prospect_ids:
            if p_id not in found_ids:
                skipped.append({"prospect_id": p_id, "name": None, "reason": "Prospect not found"})
        return {"resolved": resolved, "skipped": skipped}

    # ── Preview (merge fields rendered against the lead) ─────────────────────
    @staticmethod
    def _get_template_detail(template_id: str) -> Dict[str, Any]:
        """Fetch a template's Subject + HtmlValue/Body via the Data API."""
        def _do(token: Dict[str, str]) -> httpx.Response:
            url = (
                f"{token['instance_url']}/services/data/"
                f"{settings.SALESFORCE_API_VERSION}/sobjects/EmailTemplate/{template_id}"
            )
            with httpx.Client(timeout=settings.SALESFORCE_TIMEOUT) as client:
                return client.get(
                    url,
                    params={"fields": "Id,Name,Subject,HtmlValue,Body"},
                    headers={"Authorization": f"Bearer {token['access_token']}"},
                )

        token = SalesforceService._get_access_token()
        resp = _do(token)
        if resp.status_code == 401:
            token = SalesforceService._get_access_token(force_refresh=True)
            resp = _do(token)
        if resp.status_code != 200:
            raise RuntimeError(f"Could not load template ({resp.status_code}): {resp.text[:300]}")
        return resp.json()

    @staticmethod
    def _render_against_lead(bodies: List[str], who_id: str) -> List[str]:
        """SOAP renderEmailTemplate — merge {!...} fields against a Lead (whoId).

        The REST render action is disabled on this org, so we use the Partner
        SOAP endpoint (same OAuth token as the session id). Returns the merged
        bodies in the same order they were passed.
        """
        token = SalesforceService._get_access_token()
        ver_num = settings.SALESFORCE_API_VERSION.lstrip("v")

        def _cdata(s: str) -> str:
            # Guard against a literal ]]> inside the template breaking the CDATA.
            return (s or "").replace("]]>", "]]]]><![CDATA[>")

        body_xml = "".join(
            f"<urn:templateBodies><![CDATA[{_cdata(b)}]]></urn:templateBodies>" for b in bodies
        )
        envelope = (
            '<?xml version="1.0" encoding="utf-8"?>'
            '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
            'xmlns:urn="urn:partner.soap.sforce.com">'
            f"<soapenv:Header><urn:SessionHeader><urn:sessionId>{token['access_token']}"
            "</urn:sessionId></urn:SessionHeader></soapenv:Header>"
            "<soapenv:Body><urn:renderEmailTemplate><urn:renderRequests>"
            f"{body_xml}<urn:whoId>{who_id}</urn:whoId>"
            "</urn:renderRequests></urn:renderEmailTemplate></soapenv:Body></soapenv:Envelope>"
        )
        url = f"{token['instance_url']}/services/Soap/u/{ver_num}"
        with httpx.Client(timeout=settings.SALESFORCE_TIMEOUT) as client:
            resp = client.post(
                url,
                content=envelope.encode("utf-8"),
                headers={"Content-Type": "text/xml; charset=UTF-8", "SOAPAction": '""'},
            )
        if resp.status_code != 200:
            raise RuntimeError(f"Preview render failed ({resp.status_code})")
        errs = re.findall(r"<errors>(.*?)</errors>", resp.text, re.S)
        if errs:
            raise RuntimeError(f"Preview render error: {html.unescape(errs[0])[:200]}")
        merged = re.findall(r"<mergedBody>(.*?)</mergedBody>", resp.text, re.S)
        return [html.unescape(m) for m in merged]

    @staticmethod
    def preview_email(prospect_id: int, template_id: str) -> Dict[str, Any]:
        """Return the merged {subject, body_html, to_email, template_name} that
        WOULD be sent to this prospect's lead — so the caller can eyeball it."""
        mapping = SalesforceService._resolve_lead_ids([prospect_id])
        if not mapping["resolved"]:
            reason = (mapping["skipped"][0]["reason"] if mapping["skipped"] else "No Salesforce Lead Id")
            raise RuntimeError(reason)
        lead = mapping["resolved"][0]
        detail = SalesforceService._get_template_detail(template_id)
        raw_subject = detail.get("Subject") or ""
        raw_body = detail.get("HtmlValue") or detail.get("Body") or ""

        merged_subject, merged_body, merged_ok = raw_subject, raw_body, False
        try:
            rendered = SalesforceService._render_against_lead([raw_subject, raw_body], lead["lead_id"])
            if rendered:
                merged_subject = rendered[0] if len(rendered) > 0 else raw_subject
                merged_body = rendered[1] if len(rendered) > 1 else raw_body
                merged_ok = True
        except Exception as exc:
            # Fall back to the raw (unmerged) template — better than nothing.
            logger.warning("Salesforce preview render failed, showing raw template: %s", exc)

        return {
            "template_id": template_id,
            "template_name": detail.get("Name") or "",
            "subject": merged_subject,
            "body_html": merged_body,
            "merged": merged_ok,
            "lead_id": lead["lead_id"],
        }

    # ── Send ─────────────────────────────────────────────────────────────────
    @staticmethod
    def send_email(prospect_ids: List[int], template_id: Optional[str] = None) -> Dict[str, Any]:
        """Fire the "Send email" lead-event for the given prospects."""
        mapping = SalesforceService._resolve_lead_ids(prospect_ids)
        resolved = mapping["resolved"]
        skipped = mapping["skipped"]

        if not resolved:
            return {
                "sent_count": 0,
                "skipped": skipped,
                "message": "No prospects had a Salesforce Lead Id to email.",
            }

        lead_ids = [r["lead_id"] for r in resolved]
        payload: Dict[str, Any] = {"event": "Send email", "leadIds": lead_ids}
        if template_id:
            payload[settings.SALESFORCE_EMAIL_TEMPLATE_FIELD] = template_id

        # Prefer the AUTHENTICATED apexrest endpoint so the Apex runs as the OAuth
        # user (salesforce@tatti.com) — that user can see EmailTemplate. The public
        # Site endpoint runs as the guest user, which cannot, and returns
        # "Email template not found". Fall back to the Site URL only when OAuth
        # isn't configured.
        headers = {"Content-Type": "application/json"}
        if settings.SALESFORCE_CLIENT_ID and settings.SALESFORCE_CLIENT_SECRET:
            token = SalesforceService._get_access_token()
            url = f"{token['instance_url']}/services/apexrest/lead-event"
            headers["Authorization"] = f"Bearer {token['access_token']}"
        else:
            url = settings.SALESFORCE_LEAD_EVENT_URL

        try:
            with httpx.Client(timeout=settings.SALESFORCE_TIMEOUT) as client:
                resp = client.post(url, headers=headers, content=json.dumps(payload))
                # A revoked/expired token → refresh once and retry.
                if resp.status_code == 401 and "Authorization" in headers:
                    token = SalesforceService._get_access_token(force_refresh=True)
                    headers["Authorization"] = f"Bearer {token['access_token']}"
                    url = f"{token['instance_url']}/services/apexrest/lead-event"
                    resp = client.post(url, headers=headers, content=json.dumps(payload))
        except Exception as exc:
            logger.error("Salesforce send-email request failed: %s", exc)
            raise RuntimeError(f"Salesforce request failed: {exc}")

        try:
            sf_response: Any = resp.json()
        except Exception:
            sf_response = resp.text

        # The Apex returns 200 with {success: false, ...} on partial/handled errors.
        handled_failure = (
            isinstance(sf_response, dict) and sf_response.get("success") is False
        )
        if resp.status_code not in (200, 201, 202) or handled_failure:
            msg = sf_response.get("message") if isinstance(sf_response, dict) else sf_response
            raise RuntimeError(f"Salesforce: {msg}")

        return {
            "sent_count": len(resolved),
            "sent_to": resolved,
            "skipped": skipped,
            "salesforce_response": sf_response,
            "message": f"Triggered Salesforce email for {len(resolved)} lead(s).",
        }
