# P10 Advanced — Intent Router

> **Prerequisite:** P10 core must be complete and working. The Ticket Triage Sidecar workflow must be active, and `POST /api/automations/ticket` must return a valid response from the chatbot.

---

## What this adds

P10 core taught one automation: ticket creation. The Intent Router extends that pattern to multiple automations triggered from the same chatbot interface — all routed through a single n8n entry point.

Instead of the React app knowing which endpoint to call per intent, it sends every automation request to one FastAPI route. n8n's Switch node reads the `intent` field and routes to the right sub-workflow.

```
User types anything actionable in the chatbot
    ↓
React: classify intent client-side
    ↓
FastAPI  POST /api/automations/route  { intent, message, thread_id }
    ↓
n8n Webhook
    ↓
n8n Switch (by intent field)
    ├── "ticket"   → Ticket Creation sub-workflow  (already built)
    ├── "meeting"  → Google Calendar booking
    └── "digest"   → Open-ticket email digest
```

This teaches the pattern that scales to enterprise automation: one router, many integrations, all wired in n8n without touching the product codebase per integration.

---

## Architecture decisions

| Decision | Reason |
|---|---|
| Intent classification in React (client-side regex), not by the AI | Avoids a round-trip AI call before every message. Fast and deterministic for common phrases. |
| One FastAPI route `/api/automations/route` | The product codebase does not need to know about individual n8n workflows. New automations are wired in n8n, not in FastAPI. |
| Switch node in n8n, not multiple webhooks | Single authentication point. Easier to manage credentials. |
| Sub-workflows for each intent | Clean separation. Each intent's logic is isolated and independently testable. |

---

## Part 1 — Update n8n: add the Router workflow (20 min, manual)

### 1.1 — Create the router workflow

1. **Workflows** → **+ Add workflow** → rename to `Automation Router`

### 1.2 — Webhook trigger

1. Click `+` → **"Webhook"** → configure:
   - **HTTP Method:** POST
   - **Authentication:** Header Auth → reuse the `X-N8N-API-KEY` credential
   - **Respond:** Using 'Respond to Webhook' Node
2. Note the **Production URL** — this becomes `N8N_ROUTER_WEBHOOK_URL` in FastAPI

### 1.3 — Switch node

1. Click `+` on the Webhook output → search **"Switch"** → pick it
2. Rename to `Route by Intent`
3. **Mode:** Rules
4. Add three rules:

| Output | Condition |
|---|---|
| `ticket` | `{{ $json.body.intent }}` equals `ticket` |
| `meeting` | `{{ $json.body.intent }}` equals `meeting` |
| `digest` | `{{ $json.body.intent }}` equals `digest` |

5. **Fallback output:** add one more output named `unknown` (or leave as the default fallback)

### 1.4 — Ticket branch

Connect the `ticket` output of the Switch node to an **Execute Sub-Workflow** node:

1. Click `+` on the `ticket` output → search **"Execute Sub-Workflow"** → pick it
2. **Workflow:** select `Ticket Triage Sidecar` (your P10 core workflow)
3. **Wait for Sub-Workflow:** ON
4. **Input Data:** pass the full body through:
   ```json
   {
     "message": "{{ $json.body.message }}",
     "user_email": "{{ $json.body.user_email }}",
     "thread_id": "{{ $json.body.thread_id }}"
   }
   ```

> **Note:** For the Execute Sub-Workflow node to work, the Ticket Triage Sidecar must be configured as callable from another workflow. In n8n Cloud, sub-workflow execution is enabled by default. The sub-workflow's response flows back as the router's output.

Connect the sub-workflow output to a **Respond to Webhook** node:

```json
{
  "success": true,
  "intent": "ticket",
  "data": "{{ $json }}"
}
```

### 1.5 — Meeting branch: Google Calendar booking

Connect the `meeting` output of the Switch node. Build this inline (no sub-workflow needed for a simple booking):

**Node: AI Agent — Extract Meeting Details**

1. Click `+` on the `meeting` output → **"AI Agent"**
2. System message:
   ```
   Extract meeting booking details from the user's message.
   Return: title, date (ISO 8601), duration_minutes, attendees (comma-separated emails if mentioned).
   If date is relative (e.g. "tomorrow", "next Monday"), resolve it relative to today's date: {{ $now.toISO() }}
   ```
3. **Structured Output Parser** sub-node with schema:

```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "date": { "type": "string", "description": "ISO 8601 datetime" },
    "duration_minutes": { "type": "number", "default": 30 },
    "attendees": { "type": "string", "description": "Comma-separated emails, or empty string" },
    "summary": { "type": "string", "description": "Confirmation message for the user" }
  },
  "required": ["title", "date", "duration_minutes", "summary"]
}
```

4. Connect OpenAI Chat Model sub-node: `LiteLLM (training)`, `gpt-4o`, Responses API OFF

**Node: Google Calendar — Create Event**

1. Click `+` on AI Agent output → search **"Google Calendar"** → pick it
2. **Credential:** your Google credential with Calendar scope
3. **Operation:** Create Event
4. **Calendar ID:** `primary`
5. **Title:** `={{ $json.output.title }}`
6. **Start Time:** `={{ $json.output.date }}`
7. **Duration:** `={{ $json.output.duration_minutes }}` minutes
8. **Attendees:** `={{ $json.output.attendees }}` (leave blank if empty)

**Node: Respond to Webhook**

```json
{
  "success": true,
  "intent": "meeting",
  "summary": "{{ $('AI Agent').item.json.output.summary }}"
}
```

### 1.6 — Digest branch: open-ticket summary

Connect the `digest` output of the Switch node. This queries Supabase for open tickets and emails a summary.

**Node: PostgreSQL — Get Open Tickets**

1. Click `+` on the `digest` output → **"PostgreSQL"**
2. **Credential:** `Postgres (training)`
3. **Operation:** Execute Query
4. **Query:**
   ```sql
   SELECT ticket_id, user_email, issue, category, priority, created_at
   FROM tickets
   WHERE status = 'open'
   ORDER BY created_at DESC
   LIMIT 20
   ```

**Node: Code — Format Digest**

1. Click `+` on PostgreSQL output → **"Code"**
2. **Language:** JavaScript
3. **Code:**

```javascript
const tickets = $input.all().map(t => t.json);
if (tickets.length === 0) {
  return [{ json: { body: "<p>No open tickets.</p>", count: 0 } }];
}

const rows = tickets.map(t =>
  `<tr>
    <td style="padding:4px 8px;">${t.ticket_id}</td>
    <td style="padding:4px 8px;">${t.category}</td>
    <td style="padding:4px 8px;">${t.priority}</td>
    <td style="padding:4px 8px;">${t.issue.substring(0, 60)}...</td>
    <td style="padding:4px 8px;">${new Date(t.created_at).toLocaleDateString()}</td>
  </tr>`
).join('\n');

const body = `
<h2>Open Ticket Digest — ${new Date().toLocaleDateString()}</h2>
<p>${tickets.length} open ticket(s)</p>
<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <thead>
    <tr style="background:#f0f0f0;">
      <th style="padding:4px 8px;">Ticket ID</th>
      <th style="padding:4px 8px;">Category</th>
      <th style="padding:4px 8px;">Priority</th>
      <th style="padding:4px 8px;">Issue</th>
      <th style="padding:4px 8px;">Created</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;

return [{ json: { body, count: tickets.length } }];
```

**Node: Gmail — Send Digest**

1. Click `+` on Code output → **"Gmail"**
2. **Credential:** `Gmail (training)`
3. **Operation:** Send
4. **To:** `={{ $('Webhook').item.json.body.user_email }}`
5. **Subject:** `Open Ticket Digest — {{ $now.format('yyyy-MM-dd') }}`
6. **Email Type:** HTML
7. **Message:** `={{ $json.body }}`

**Node: Respond to Webhook**

```json
{
  "success": true,
  "intent": "digest",
  "summary": "Digest sent — {{ $('Code').item.json.count }} open ticket(s)"
}
```

### 1.7 — Unknown intent fallback

Connect the fallback/unknown output of the Switch to a **Respond to Webhook**:

```json
{
  "success": false,
  "error": "Unknown intent: {{ $json.body.intent }}"
}
```

### 1.8 — Activate the router workflow

Toggle the workflow **Active**. Copy the **Production URL** → this becomes `N8N_ROUTER_WEBHOOK_URL`.

---

## Part 2 — FastAPI: add the router endpoint (15 min)

### 2.1 — Environment variable

Add to `.env` and `.env.example`:

```bash
N8N_ROUTER_WEBHOOK_URL=https://<yourname>.app.n8n.cloud/webhook/<router-uuid>
```

Add to `backend/app/core/config.py`:

```python
N8N_ROUTER_WEBHOOK_URL: Optional[str] = None
```

### 2.2 — Schema

Add to `backend/app/schemas/automation.py`:

```python
from typing import Literal

class AutomationRouteRequest(BaseModel):
    intent: Literal["ticket", "meeting", "digest"]
    message: str = Field(..., min_length=1)
    thread_id: uuid.UUID | None = None


class AutomationRouteResponse(BaseModel):
    success: bool
    intent: str
    summary: str | None = None
    data: dict | None = None
```

### 2.3 — Service

Add to `backend/app/services/automation.py`:

```python
async def route_automation(
    *,
    intent: str,
    message: str,
    user_email: str,
    thread_id: str | None,
) -> dict:
    if not settings.N8N_ROUTER_WEBHOOK_URL or not settings.N8N_API_KEY:
        raise RuntimeError("n8n router is not configured")

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            settings.N8N_ROUTER_WEBHOOK_URL,
            json={
                "intent": intent,
                "message": message,
                "user_email": user_email,
                "thread_id": thread_id,
            },
            headers={"X-N8N-API-KEY": settings.N8N_API_KEY},
        )
        response.raise_for_status()
        return response.json()
```

### 2.4 — Router endpoint

Add to `backend/app/api/automation.py`:

```python
from app.schemas.automation import AutomationRouteRequest, AutomationRouteResponse
from app.services.automation import route_automation


@router.post("/route", response_model=AutomationRouteResponse)
async def route_action(
    payload: AutomationRouteRequest,
    current_user: User = Depends(get_current_user),
) -> AutomationRouteResponse:
    try:
        result = await route_automation(
            intent=payload.intent,
            message=payload.message,
            user_email=current_user.email,
            thread_id=str(payload.thread_id) if payload.thread_id else None,
        )
        return AutomationRouteResponse(**result)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail={"error": "n8n_failed", "message": str(exc)})
```

---

## Part 3 — React: extend the automation handler (20 min)

### 3.1 — API helper

Add to `frontend/src/lib/api.ts`:

```ts
// Extend automationApi:
export const automationApi = {
  // existing:
  createTicket: (message: string, threadId: string | null) =>
    api.post<{ success: boolean; ticket_id: string; status: string; summary: string }>(
      "/automations/ticket", { message, thread_id: threadId }
    ),

  // new:
  route: (intent: "ticket" | "meeting" | "digest", message: string, threadId: string | null) =>
    api.post<{ success: boolean; intent: string; summary: string | null }>(
      "/automations/route", { intent, message, thread_id: threadId }
    ),
};
```

### 3.2 — Update intent detection in ChatPage.tsx

Replace the single `TICKET_INTENT` handler with a multi-intent handler:

```tsx
// At the start of handleSend, replace the P10 core TICKET_INTENT block with:

const INTENTS: Array<{ pattern: RegExp; intent: "ticket" | "meeting" | "digest" }> = [
  {
    pattern: /^(create|log|open|submit|raise)\s+(a\s+)?(ticket|support ticket|issue)/i,
    intent: "ticket",
  },
  {
    pattern: /^(book|schedule|set up|create)\s+(a\s+)?(meeting|call|session)/i,
    intent: "meeting",
  },
  {
    pattern: /^(send|show|email|get)\s+(me\s+)?(a\s+)?(ticket\s+)?(digest|summary|report)/i,
    intent: "digest",
  },
];

const matched = INTENTS.find(({ pattern }) => pattern.test(text));
if (matched) {
  const pending = chat.beginUserTurn(text, attachments);
  if (pending === null) return;
  let threadId = activeThreadId;
  if (threadId === null) {
    try {
      const created = await threads.create(text);
      threadId = created.id;
      chat.markJustCreated();
      setActiveThreadId(threadId);
    } catch {
      chat.cancelTurn(pending);
      return;
    }
  }
  try {
    const result = await automationApi.route(matched.intent, text, threadId);
    const displayText = result.summary ?? `${matched.intent} action completed.`;
    chat.settleAssistantTurn(pending, text, displayText, threadId);
  } catch {
    chat.cancelTurn(pending);
  }
  return;
}
```

Non-matching messages fall through to the existing chat stream as before.

---

## Testing the router

### Ticket intent (same as P10 core)

```
Create a high priority ticket: my VPN is not working.
```

Expected: ticket created in Supabase, email sent, chatbot shows summary.

### Meeting intent

```
Schedule a meeting tomorrow at 2pm to review the Q2 results
```

Expected: Google Calendar event created, chatbot shows confirmation.

### Digest intent

```
Send me a ticket digest
```

Expected: email arrives with table of open tickets from Supabase, chatbot shows count.

### Unknown intent (fallback)

Send a direct API call with an unknown intent:

```bash
curl -X POST /api/automations/route \
  -H "Content-Type: application/json" \
  -d '{ "intent": "unknown_action", "message": "test", "thread_id": null }'
```

Expected: 422 (Pydantic validates the `intent` enum before it reaches n8n).

---

## Acceptance criteria

- [ ] `Create a ticket:...` → ticket in Supabase + email confirmation
- [ ] `Schedule a meeting...` → Google Calendar event created + chatbot confirmation
- [ ] `Send me a ticket digest` → email with open ticket table + chatbot summary
- [ ] Non-matching messages → normal chatbot response, no n8n call
- [ ] All three flows through the **same FastAPI endpoint** (`POST /api/automations/route`)
- [ ] All three flows through the **same n8n webhook** (Switch node routes them)

---

## Extending the router

Adding a new intent requires:

1. **n8n**: add a new rule to the Switch node, wire up new nodes on the new output
2. **FastAPI schema**: add the new intent to the `Literal` type in `AutomationRouteRequest`
3. **React**: add a new entry to the `INTENTS` array

The product codebase (`api.ts`, `useChat.ts`) does not change. This is the benefit of the router pattern: new automations are n8n configuration changes, not product code changes.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Switch node not routing correctly | Check that `intent` is in `$json.body.intent` (not `$json.intent`). The Webhook node wraps the body under `.body`. |
| Execute Sub-Workflow returns empty | The sub-workflow (Ticket Triage Sidecar) must be Active. Sub-workflows cannot be called if they are inactive. |
| Google Calendar auth error | The Google credential does not have Calendar scope. Create a new Google credential with Calendar API enabled. |
| Meeting date/time parsed incorrectly | The AI resolved the relative date wrong. Check that the system message includes `$now.toISO()` as the reference date. |
| Digest shows 0 tickets | Query is correct but the tickets table has no rows. Create a ticket first using the P10 core flow. |
| FastAPI 422 on `intent` field | The intent value sent by React does not match the `Literal` type. Check the intent string matches exactly. |
