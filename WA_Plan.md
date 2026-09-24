# WhatsApp Provider Toggle — Cloud API + Baileys Migration Plan

## Context

The People Management CRM currently sends all WhatsApp messages (marketing outreach + notifications) through Meta's Cloud API at ~₹0.90/delivered marketing message. With 400–2,000 messages/day, this is a significant cost.

The goal is to build a **provider-agnostic abstraction layer** so each WhatsApp number can independently toggle between:
- **Cloud API** (official, paid, supports templates/flows)
- **Baileys** (unofficial WhatsApp Web protocol, free, text/media only)

This is NOT a full migration — it's a plug-and-play toggle.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  Frontend (Next.js)                               │
│  - Number Manager (add/toggle/QR scan)            │
│  - Inbox/Campaigns (unchanged, provider-agnostic) │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│  FastAPI Backend                                  │
│  ┌──────────────────────────────────┐             │
│  │ WhatsAppProvider (abstract)      │             │
│  │  ├── CloudAPIProvider            │←─ Meta API  │
│  │  └── BaileysProvider ─────────┐  │             │
│  └──────────────────────────────┐│──┘             │
│  ProviderRouter: picks provider ││                │
│  by wa_number_id from DB        ││                │
└─────────────────────────────────┼┼────────────────┘
                                  ││ HTTP
                         ┌────────▼▼───────┐
                         │ Baileys Bridge   │
                         │ (Node.js :3001)  │
                         │ - Send REST API  │
                         │ - QR / sessions  │
                         │ - Webhook→FastAPI│
                         │ - Baileys lib    │
                         └─────────────────┘
```

---

## Phase 1: Database + Provider Abstraction (no behavior change)

### 1.1 New table: `whatsapp_numbers`

Stores per-number provider configuration. Seed with current Cloud API creds from `.env`.

| Column | Type | Purpose |
|---|---|---|
| `id` | serial PK | |
| `phone_number` | varchar(20) unique | e.g. '919876543210' |
| `display_label` | varchar(100) | e.g. 'Admissions Line 1' |
| `provider` | varchar(20) default 'cloud' | 'cloud' or 'baileys' |
| `cloud_phone_number_id` | varchar(100) nullable | Meta phone number ID |
| `cloud_waba_id` | varchar(100) nullable | Meta WABA ID |
| `cloud_access_token` | text nullable | Meta access token |
| `baileys_session_id` | varchar(100) nullable | Bridge session key |
| `baileys_status` | varchar(30) default 'disconnected' | disconnected/qr_pending/connected |
| `is_active` | boolean default true | |
| `created_at` / `updated_at` | timestamptz | |

### 1.2 Alter existing tables

- `whatsapp_messages`: add `provider varchar(20) default 'cloud'`, `wa_number_id integer references whatsapp_numbers(id)` (both nullable for existing rows)
- `whatsapp_campaigns`: add `wa_number_id integer references whatsapp_numbers(id)` (nullable)

### 1.3 Provider abstraction layer

Create `backend/services/providers/`:

| File | Class | Role |
|---|---|---|
| `base.py` | `WhatsAppProvider` (ABC) | Interface: `send_text()`, `send_template()`, `send_media()`, `get_connection_status()`, `supports_templates()` |
| `cloud_provider.py` | `CloudAPIProvider` | Wraps existing Meta Cloud API logic, reads creds from `whatsapp_numbers` row |
| `baileys_provider.py` | `BaileysProvider` | HTTP calls to the Node.js bridge |
| `router.py` | `get_provider_for_number()`, `get_default_provider()` | Loads config from DB, returns the right provider instance |

All return a uniform `SendResult(success, message_id, error)`.

### 1.4 Refactor existing services to use providers

- **`whatsapp_service.py`**: `send_text_message()` and `send_template_message()` delegate to the provider router instead of hardcoding `graph.facebook.com`. `log_outbound()` gets `provider` + `wa_number_id` columns. Module-level globals become fallback only.
- **`whatsapp_campaign_service.py`**: `run_campaign_async()` loads provider from campaign's `wa_number_id`. Rejects template campaigns if provider is Baileys.
- **`tasks.py`**: `_send_text()`, `_send_prospectus()`, `_send_custom_media()` accept a provider parameter, fall back to `get_default_provider()`.

**Deploy Phase 1. Verify all existing Cloud API functionality works identically.**

---

## Phase 2: Baileys Bridge (Node.js microservice)

### 2.1 New directory: `baileys-bridge/`

```
baileys-bridge/
  package.json          # express, @whiskeysockets/baileys, qrcode, axios
  Dockerfile
  src/
    index.ts            # Express server on :3001
    routes/send.ts      # POST /send/text, /send/media
    routes/session.ts   # POST /session/start, GET /session/:id/status, GET /session/:id/qr, POST /session/:id/logout
    services/baileys.ts # Baileys socket management, multi-session
    services/store.ts   # useMultiFileAuthState on /data/sessions/
```

### 2.2 Bridge REST API

| Endpoint | Purpose |
|---|---|
| `POST /send/text` | `{session_id, to, text}` → send text via Baileys |
| `POST /send/media` | `{session_id, to, media_type, url, caption}` → send media |
| `POST /session/start` | `{session_id}` → start Baileys socket, returns QR if needed |
| `GET /session/:id/status` | Connection status + phone info |
| `GET /session/:id/qr` | Current QR code as base64 |
| `POST /session/:id/logout` | Disconnect + clear session |

### 2.3 Webhook callbacks to FastAPI

When bridge receives inbound messages (`messages.upsert` event):
- Normalize to `{source, session_id, from, message_id, type, body, media, profile_name}`
- POST to `FASTAPI_URL/whatsapp/baileys-webhook`

When bridge gets delivery/read receipts (`messages.update` event):
- POST to `FASTAPI_URL/whatsapp/baileys-status-webhook`

### 2.4 New backend routes

```python
POST /whatsapp/baileys-webhook       # Inbound messages from bridge
POST /whatsapp/baileys-status-webhook # Delivery/read receipts from bridge
GET  /whatsapp/numbers               # List all configured numbers
POST /whatsapp/numbers               # Add a number
PATCH /whatsapp/numbers/{id}         # Toggle provider, update config
DELETE /whatsapp/numbers/{id}        # Remove
POST /whatsapp/baileys/start-session # Proxy to bridge
GET  /whatsapp/baileys/qr/{id}      # Proxy QR from bridge
GET  /whatsapp/baileys/status/{id}  # Proxy status from bridge
POST /whatsapp/baileys/logout/{id}  # Proxy logout
```

### 2.5 Rate limits in bridge

- Max 30 messages/minute per session, max 200/day (configurable via env)
- Returns 429 if exceeded — `BaileysProvider` handles gracefully

**Deploy Phase 2. Test with a dedicated test number.**

---

## Phase 3: Frontend Admin UI

### 3.1 New tab: "Numbers" in `/admin/whatsapp/[tab]`

`UI/components/whatsapp/number-manager.tsx`:
- Table of all configured numbers with provider badge, status dot, actions
- "Add Number" dialog: phone number, label, provider select (Cloud/Baileys)
- For Cloud: fields for Phone Number ID, WABA ID, Access Token
- For Baileys: "Link Account" button → QR scanner modal

### 3.2 QR Scanner component

`UI/components/whatsapp/qr-scanner.tsx`:
- Modal that polls `getBaileysQr(numberId)` every 2s
- Shows QR image, detects scan via status polling
- Success state when connected

### 3.3 Update existing components

- **`connection-badge.tsx`**: Show all numbers with provider indicator + status dots
- **Campaign creation** (in `[tab]/page.tsx`): Add "Send from" number picker. If Baileys selected, disable template picker with tooltip
- **Inbox/drawer**: No structural changes — already provider-agnostic via `whatsapp_messages` table. Hide 24h window badge for Baileys numbers.

### 3.4 Extend `api-client.ts`

Add `whatsappApi.getNumbers()`, `.addNumber()`, `.updateNumber()`, `.deleteNumber()`, `.startBaileysSession()`, `.getBaileysQr()`, `.getBaileysStatus()`, `.logoutBaileys()`.

**Deploy Phase 3.**

---

## Phase 4: Go Live

1. Admin adds a Baileys number via the Numbers tab
2. Scans QR code to link the WhatsApp account
3. Sends test messages from inbox
4. Monitor for 1-2 days
5. Gradually shift notification traffic to Baileys numbers if stable

---

## Baileys Limitations & Risk Mitigations

| Risk | Mitigation |
|---|---|
| **Account ban** | Use dedicated numbers not tied to business verification. Rate limit in bridge. Never use for bulk campaigns. |
| **Session loss** (container restart) | GCS FUSE mount persists auth state. Auto-reconnect on restart. Falls back to `qr_pending` if re-auth fails. |
| **No template support** | UI disables template picker for Baileys numbers. Campaign creation rejects template campaigns on Baileys. |
| **No flows** | Flows tab grayed out for Baileys numbers. |
| **No Meta delivery guarantees** | `provider` column in `whatsapp_messages` tracks provenance. Admin dashboard can compare delivery rates. |
| **Feature gap confusion** | Clear labels in UI: "Cloud API (Official)" vs "Baileys (Unofficial)" with tooltip explaining limitations. |

---

## Deployment (Cloud Run)

- **Baileys bridge**: Separate Cloud Run service, `min-instances=1`, `max-instances=1` (persistent WebSocket). GCS FUSE mount at `/data/sessions/`. Internal-only ingress.
- **Service auth**: Shared secret header (`X-Bridge-Secret`) for bridge↔FastAPI calls, or Cloud Run IAM.
- **New env vars**: `BAILEYS_BRIDGE_URL`, `BAILEYS_BRIDGE_SECRET` in backend. `FASTAPI_URL`, `BRIDGE_SECRET` in bridge.

---

## Files to Modify/Create

**New files:**
- `backend/services/providers/__init__.py`, `base.py`, `cloud_provider.py`, `baileys_provider.py`, `router.py`
- `backend/migrations/add_whatsapp_numbers.py`
- `baileys-bridge/` (entire new service)
- `UI/components/whatsapp/number-manager.tsx`
- `UI/components/whatsapp/qr-scanner.tsx`

**Modified files:**
- `backend/services/whatsapp_service.py` — delegate to provider router
- `backend/services/webhook_service.py` — add Baileys webhook handler
- `backend/services/whatsapp_campaign_service.py` — provider-aware campaigns
- `backend/tasks.py` — provider-aware auto-reply sends
- `backend/routes/whatsapp_routes.py` — number management + Baileys proxy routes
- `backend/config.py` — add `BAILEYS_BRIDGE_URL`, `BAILEYS_BRIDGE_SECRET`
- `UI/lib/api-client.ts` — extend `whatsappApi`
- `UI/app/admin/whatsapp/[tab]/page.tsx` — Numbers tab, campaign "send from" picker
- `UI/components/whatsapp/connection-badge.tsx` — multi-number display

---

## Verification

1. **Phase 1**: Deploy, send template + text message via Cloud API → verify `whatsapp_messages` has `provider='cloud'` + `wa_number_id` set. All inbox/campaign features work unchanged.
2. **Phase 2**: Start bridge locally → scan QR → send text from Python → verify delivery. Send inbound message to Baileys number → verify it appears in `whatsapp_messages` with `provider='baileys'` and prospect is created/matched.
3. **Phase 3**: Open Numbers tab → add Baileys number → scan QR → send from inbox drawer → verify in chat thread.
4. **Phase 4**: Toggle a number from Cloud to Baileys and back → verify both paths work. Run a Cloud API campaign → verify Baileys numbers are excluded.
