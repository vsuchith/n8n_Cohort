# Student Workflow — n8n Sidecar Integration

> Use this checklist while implementing the n8n continuation inside `ai-forge-chatbot/amzur-ai-chat`.

---

## Goal

Add one business action to the existing chatbot:

```text
User asks for a support ticket
  → chatbot calls FastAPI
  → FastAPI calls n8n
  → n8n creates and triages a Supabase ticket row
  → n8n sends a Gmail confirmation
  → chatbot shows ticket confirmation
```

The chatbot remains the product. n8n is the workflow sidecar.

---

## Step 1 — Prepare n8n

Confirm:

- [ ] n8n Cloud instance opens.
- [ ] `LiteLLM (training)` credential works.
- [ ] Supabase PostgreSQL credential works in n8n.
- [ ] Gmail credential works in n8n.

Create this table in the same Supabase project used by your chatbot:

```sql
CREATE TABLE IF NOT EXISTS tickets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     text        UNIQUE NOT NULL,
  user_email    text        NOT NULL,
  issue         text        NOT NULL,
  category      text        NOT NULL DEFAULT 'General',
  priority      text        NOT NULL DEFAULT 'medium',
  status        text        NOT NULL DEFAULT 'open',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  thread_id     text,
  assigned_team text,
  next_action   text
);
```

---

## Step 2 — Build The Workflow

Create this n8n workflow:

```text
Webhook Trigger
  ↓
Normalize Payload
  ↓
AI Agent
  ├── OpenAI Chat Model
  └── Structured Output Parser
  ↓
PostgreSQL Insert Ticket
  ↓
Gmail Send Confirmation
  ↓
Respond to Webhook
```

Use:

- Webhook method: `POST`
- Webhook auth: Header Auth
- Header: `X-N8N-API-KEY`
- PostgreSQL table: `tickets`
- Status value: `{{ "open" }}`
- Extra triage fields: `assigned_team` and `next_action`

Test with curl before touching the app code.

---

## Step 3 — Build Workflow 2: Status Update (optional, 10 min)

Create a second n8n workflow named `Ticket Status Notifier`:

```text
Webhook Trigger (same X-N8N-API-KEY auth)
  ↓
Gmail: Send status notification to {{ $json.body.user_email }}
  Subject: Ticket {{ $json.body.ticket_id }} Updated: {{ $json.body.new_status }}
  ↓
Respond to Webhook: { "success": true }
```

Activate it and note its Production URL as `N8N_STATUS_WEBHOOK_URL`.

---

## Step 4 — Activate n8n

After curl tests pass on both workflows:

- [ ] Toggle `Ticket Triage Sidecar` Active → copy Production URL → `N8N_WEBHOOK_URL`
- [ ] Toggle `Ticket Status Notifier` Active → copy Production URL → `N8N_STATUS_WEBHOOK_URL`
- [ ] Keep the Header Auth secret ready for the backend `.env`

Do not use Test URLs in the app.

---

## Step 5 — Add FastAPI Integration

In the chatbot repo, add:

```text
backend/app/schemas/automation.py
backend/app/services/automation.py
backend/app/api/automation.py
```

Update:

```text
backend/app/core/config.py
backend/app/main.py
.env
.env.example
```

Environment variables:

```bash
N8N_WEBHOOK_URL=<production webhook url from Ticket Triage Sidecar>
N8N_API_KEY=<header auth secret>
N8N_STATUS_WEBHOOK_URL=<production webhook url from Ticket Status Notifier>
```

The FastAPI routes must:

- Use `get_current_user` — no new auth scheme.
- `POST /api/automations/ticket` — sends `message`, `user_email`, `thread_id`, `source` to n8n; returns `{ success, ticket_id, status, summary }`.
- `GET /api/automations/tickets` — queries the `tickets` table for the logged-in user; returns list of tickets ordered newest first.
- `PATCH /api/automations/ticket/{ticket_id}/status` — updates Supabase `tickets` table directly, then calls `N8N_STATUS_WEBHOOK_URL` to send a Gmail notification.

---

## Step 6 — Add React Integration

The chatbot already has a dedicated **Create Ticket** panel in the sidebar tools — it is separate from the normal chat input. You do not need to add regex routing to the chat. The panel calls the automation API directly on submit.

Update:

```text
frontend/src/lib/api.ts
```

Add `automationApi.createTicket(...)` and `automationApi.getTickets()` to `api.ts`.

The Create Ticket panel has two tabs:

- **Create Ticket** — textarea + Submit button, calls `automationApi.createTicket()`, shows confirmation with ticket ID and summary
- **My Tickets** — on tab click calls `automationApi.getTickets()`, renders a table with columns: ticket ID, category, priority, status (dropdown), date. Changing the status dropdown calls `automationApi.updateTicketStatus()` → `PATCH /api/automations/ticket/{id}/status` → Supabase update → n8n Ticket Status Notifier → Gmail notification

Normal chat continues through the existing chat path unchanged.

---

## Step 7 — Test End To End

Start backend and frontend. Log in.

In the sidebar, click **Create Ticket** → describe the issue → click **Submit Ticket**:

```text
Create a high priority ticket: my VPN is not working since this morning.
```

Expected:

- [ ] DevTools shows `POST /api/automations/ticket`.
- [ ] FastAPI returns 200.
- [ ] n8n execution is green.
- [ ] Supabase `tickets` table has a new row with assigned team and next action.
- [ ] Gmail confirmation reaches the user inbox.
- [ ] Panel displays the ticket ID and summary.
- [ ] Click **My Tickets** tab → `GET /api/automations/tickets` returns 200 → ticket appears in the list.
- [ ] Change status dropdown to `in_progress` → `PATCH /api/automations/ticket/{id}/status` returns 200 → Supabase row updated → Gmail status notification received.

Then use the normal chat input to confirm existing functionality is unaffected:

```text
What is the capital of Japan?
```

Expected:

- [ ] Normal streaming chat response.

---

## Step 8 — Submit Evidence

Submit:

- [ ] Screenshot of chatbot ticket request and confirmation (ticket ID visible).
- [ ] Screenshot of DevTools Network showing `POST /api/automations/ticket`.
- [ ] Screenshot of n8n `Ticket Triage Sidecar` successful execution.
- [ ] Screenshot of Supabase `tickets` row with `ticket_id`, `category`, `priority`, `assigned_team`.
- [ ] Screenshot of Gmail creation confirmation email.
- [ ] Exported n8n workflow JSON (from workflow ⋮ → Download).
- [ ] Screenshot or short note proving normal chat still works (no n8n call for a non-ticket message).

---

## Common Fixes

| Symptom | Fix |
|---|---|
| Webhook returns 404 during curl | Click "Listen for test event" before using the Test URL. |
| Webhook returns 404 from app | Use Production URL and activate the workflow. |
| FastAPI gets 401 from n8n | `N8N_API_KEY` does not match Header Auth secret. |
| n8n runs but no ticket row appears | PostgreSQL credential, table name, or column mapping is wrong. Use the Supabase pooler on port `6543`. |
| Gmail does not send (creation) | Re-open the Gmail credential and re-authorize OAuth. |
| Gmail "Cannot read properties of undefined (reading 'split')" in Status Notifier | The canvas AI uses wrong field names: `$json.body.email` (should be `$json.body.user_email`) and camelCase `$json.body.ticketId` / `$json.body.status` (should be `$json.body.ticket_id` / `$json.body.new_status`). Fix **To**, **Subject**, and **Message** fields manually in the Gmail node. |
| Ticket ID is missing in response | Check the node name `Normalize Payload`; expressions are case-sensitive. |
| Create Ticket panel does not call n8n | Check `automationApi` import in `api.ts` and confirm the Submit button is wired to `automationApi.createTicket()`. |
| Submit returns 422 | The `message` field is empty or missing — confirm the textarea value is passed in the request body. |
