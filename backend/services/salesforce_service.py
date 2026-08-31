"""
salesforce_service.py — bridge to the TATTI CRM Salesforce Apex REST endpoints.

Two capabilities are exposed:
  1. list_email_templates() — GET the (optional) SALESFORCE_TEMPLATES_URL and
     normalise whatever shape it returns into [{"id", "name"}]. Used to populate
     the caller's "select a template" dropdown in the Email side-sheet.
  2. send_email(prospect_ids, template_id) — resolve each prospect's Salesforce
     Lead Id (prospects.lead_id, the 00Q… value) and POST the lead-event payload
        {"event": "Send email", "leadIds": [...], "<template field>": template_id}
     Prospects without a lead_id are reported back as "skipped" rather than
     silently dropped, so the UI can tell the caller which rows couldn't be sent.

The Site endpoints are public (guest-user Apex REST) so no OAuth is performed.
"""
import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from config import Settings
from database.connection import get_db_connection

logger = logging.getLogger(__name__)
settings = Settings()


class SalesforceService:
    @staticmethod
    def list_email_templates() -> List[Dict[str, Any]]:
        """Return [{"id", "name"}] for the caller's template picker.

        If SALESFORCE_TEMPLATES_URL is not configured we return an empty list —
        the UI then offers "Send default email (no template)".
        """
        url = (settings.SALESFORCE_TEMPLATES_URL or "").strip()
        if not url:
            return []
        try:
            with httpx.Client(timeout=settings.SALESFORCE_TIMEOUT) as client:
                resp = client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.warning("Salesforce templates fetch failed: %s", exc)
            raise RuntimeError(f"Could not load Salesforce templates: {exc}")

        # Accept a few common shapes: a bare list, {"templates": [...]},
        # {"data": [...]}, or {"records": [...]}.
        if isinstance(data, dict):
            for key in ("templates", "data", "records", "items"):
                if isinstance(data.get(key), list):
                    data = data[key]
                    break
        if not isinstance(data, list):
            return []

        normalised: List[Dict[str, Any]] = []
        for row in data:
            if isinstance(row, str):
                normalised.append({"id": row, "name": row})
                continue
            if not isinstance(row, dict):
                continue
            tid = (
                row.get("id")
                or row.get("Id")
                or row.get("templateId")
                or row.get("value")
            )
            name = (
                row.get("name")
                or row.get("Name")
                or row.get("label")
                or row.get("DeveloperName")
                or tid
            )
            if tid is None:
                continue
            normalised.append({"id": str(tid), "name": str(name)})
        return normalised

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
        # prospect ids that don't exist at all
        for p_id in prospect_ids:
            if p_id not in found_ids:
                skipped.append({"prospect_id": p_id, "name": None, "reason": "Prospect not found"})
        return {"resolved": resolved, "skipped": skipped}

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

        url = settings.SALESFORCE_LEAD_EVENT_URL
        try:
            with httpx.Client(timeout=settings.SALESFORCE_TIMEOUT) as client:
                resp = client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    content=json.dumps(payload),
                )
        except Exception as exc:
            logger.error("Salesforce send-email request failed: %s", exc)
            raise RuntimeError(f"Salesforce request failed: {exc}")

        try:
            sf_response: Any = resp.json()
        except Exception:
            sf_response = resp.text

        if resp.status_code not in (200, 201, 202):
            raise RuntimeError(
                f"Salesforce returned {resp.status_code}: {sf_response}"
            )

        return {
            "sent_count": len(resolved),
            "sent_to": resolved,
            "skipped": skipped,
            "salesforce_response": sf_response,
            "message": f"Triggered Salesforce email for {len(resolved)} lead(s).",
        }
