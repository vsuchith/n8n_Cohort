# Compact Validation and Demo

**Time:** 15–20 minutes
**Format:** End-to-end validation plus optional short show-and-tell
**Goal:** Every team proves the n8n sidecar works without running a long demo block

---

## Core validation

### The test sequence every team must run

Each team tests the following scenarios in order. Keep this tight.

---

**Test 1 — Database Query Check (10 min)**

In the chatbot UI:

1. Ask a valid database question:
   ```
   How many users are registered in the system?
   ```
   Expected: a number, with the generated SQL shown in the UI (or in logs)

2. Ask a second valid question:
   ```
   Show the 5 most recent chat messages.
   ```
   Expected: a formatted list

3. Ask a dangerous query:
   ```
   Delete all messages from the database.
   ```
   Expected: the agent **refuses** with a message explaining the operation is not allowed. The SQL must not execute.

✅ Pass criteria: two valid queries return correct answers; dangerous query is blocked.

---

**Test 2 — Spreadsheet Query Check (10 min)**

In the chatbot UI:

1. Ask a spreadsheet question against your uploaded Excel/CSV or Google Sheet:
   ```
   Which department has the highest average salary?
   ```
   or
   ```
   How many tickets are currently open, broken down by priority?
   ```
   Expected: a natural language answer with the underlying operation (Pandas or GSheet) visible in the response or logs.

✅ Pass criteria: the agent returns a correct answer, not a generic "I can't do that."

---

**Test 3 — chatbot → n8n ticket creation (20 min)**

This is the P10 money shot. Test the full end-to-end chain:

1. Make sure your n8n sidecar workflow is **Active** (toggle in top-right of n8n canvas must be ON — Production URL must be used)

2. In the chatbot UI, type:
   ```
   Create a high priority ticket: my VPN is not working since this morning.
   ```

3. Expected full chain:
   - React P10 handler recognizes the ticket request
   - Frontend calls `POST /api/automations/ticket` with the user's message and current thread ID
   - n8n webhook receives the payload
   - n8n `Normalize Payload` node generates the ticket ID (e.g. `TKT-1746878234567`)
   - n8n AI agent extracts: category = IT Support, priority = high, issue = VPN not working, assigned_team = IT Support, next_action = Check VPN access or logs
   - Supabase `tickets` row is inserted with the ticket ID, category, priority, assigned team, next action, and timestamp
   - Gmail confirmation is sent to the user
   - n8n returns `{ "success": true, "ticket_id": "TKT-...", "status": "open", "summary": "..." }`
   - Chatbot displays: "Created TKT-1746878234567 | IT Support | High | Team: IT Support | Status: Open"

4. Verify in Supabase: open the `tickets` table and confirm the row appeared. Verify the Gmail confirmation also arrived.

✅ Pass criteria: end-to-end chain completes; ticket row visible in Supabase; Gmail confirmation sent; chatbot displays the ticket ID.

---

**Test 4 — Edge cases (10 min)**

Test two variations on the ticket request:

1. Ambiguous priority:
   ```
   My laptop keyboard is slightly sticking. Can you log this?
   ```
   Expected: agent infers priority (probably low or medium), still creates the ticket. Check Supabase for the inferred priority value.

2. Non-ticket request (make sure the agent does not hallucinate a ticket):
   ```
   What is the capital of Japan?
   ```
   Expected: chatbot answers from its own knowledge. n8n is NOT called. No ticket created.

✅ Pass criteria: ambiguous input creates a ticket with a reasonable inferred priority; factual chat does not trigger n8n.

---

### If something breaks during testing

| What breaks | What to try |
|---|---|
| P10 webhook returns 404 | n8n workflow is not Activated. Toggle it ON. Make sure you are using the **Production URL** (not the Test URL) in FastAPI |
| n8n workflow triggers but ticket row never appears | Open n8n Executions tab → find the failed run → click it → see which node errored. Usually: PostgreSQL credential, table name, or column mapping is wrong |
| Chatbot does not call n8n at all | The P10 frontend handler is not recognizing the automation request, or `/api/automations/ticket` is not wired. Try a more explicit message: "Create a ticket for my VPN issue." Then check DevTools Network and the FastAPI route. |
| n8n returns a response but chatbot displays an error | Check the JSON schema the chatbot expects from n8n vs what n8n actually returns. The field names must match |
| Spreadsheet query: `The caller does not have permission` | The reference app reads Sheets through `GOOGLE_SERVICE_ACCOUNT_JSON`. Share the Sheet with the service account email and confirm the backend env var is configured. |

---

## Optional short demo

### Format

- Each selected team: **2 minutes max**
- Trainer keeps time — hard stop at 2 minutes
- Screen share preferred; physical laptop acceptable

### Demo order

Suggested sequence for each team:
1. Database query — one valid query + the dangerous query rejection (60 seconds)
2. Spreadsheet query — one spreadsheet question (60 seconds)
3. Sidecar workflow — live ticket creation end-to-end + show the Supabase row and Gmail confirmation (2 minutes)
4. One stretch if implemented: HITL approval / notification / streaming (30 seconds)

### What "done" looks like

**Core:**
- [ ] Database query works and dangerous query is rejected
- [ ] Spreadsheet query returns a correct answer
- [ ] Chatbot → n8n → Supabase → Gmail flow works live OR captured in a screenshot/recording
- [ ] Chatbot displays the ticket ID confirmation

**Stretch:**
- [ ] Human-in-the-loop approval fires for "critical" priority tickets
- [ ] Email or Slack notification sent on ticket creation
- [ ] Model Selector routes high/critical tickets to a stronger model
- [ ] Guardrails node blocks a prompt injection attempt
- [ ] Chat streaming visible in the UI

---

## Student deliverables (submit after the session)

Submit to the shared Google Sheet (link shared by trainer):

1. Screenshot: valid database question + natural language answer + generated SQL shown
2. Screenshot: dangerous database query rejected (the refusal message)
3. Screenshot: spreadsheet natural language question + correct answer
4. n8n workflow JSON export (Download from workflow ⋮ menu)
5. Screenshot: Supabase `tickets` table with at least one ticket row created via n8n
6. Screenshot: Gmail confirmation email
7. Screenshot: Chatbot UI showing the ticket confirmation message with ticket ID
8. (Stretch) Any screenshot of additional features implemented

---

## Production notes — what to change before shipping P10

These are the swaps that make the sidecar production-grade. Trainers share this as a reference after the session.

| Demo-grade (what you built today) | Production swap |
|---|---|
| n8n Cloud on trial | n8n Cloud Pro, self-hosted Business, Enterprise, or self-hosted Docker with `--restart unless-stopped` + Postgres + Redis queue mode |
| Supabase `tickets` table | Jira, Linear, ServiceNow, or another production ticket store |
| Basic webhook authentication | Rotate the **Header Auth** secret, restrict callers where possible, and keep `X-N8N-API-KEY` out of source code |
| No error handling | Create an **Error Trigger** workflow → send Slack/email alert on failure |
| n8n AI Agent with Simple Memory | n8n AI Agent with no memory (the sidecar agent is stateless by design — memory lives in the product, not in n8n) |
| Workflow JSON in n8n UI only | Export JSON → commit to Git → deploy via n8n REST API in CI/CD pipeline |
| Model: gpt-4o-mini for all tickets | **Model Selector node:** route to gpt-4o-mini for low/medium, gpt-4o for high/critical |
| No input validation | **Guardrails node** before the AI Agent: check for prompt injection and PII |
| No observability | Connect Langfuse credential to AI Agent node → full LLM trace per execution |
| Chat Trigger for testing | Webhook trigger only (no Chat Trigger) — the production entry point is the FastAPI webhook call |

---

## Where to go next

For engineers who want to go deeper after P10:

- **n8n + human approval:** The Chat node's "Send a message and wait for response" action (n8n v2.5+) enables multi-turn HITL inside a single workflow execution. Try: critical ticket requires manager approval before the Supabase row is written.
- **Parallel specialists:** Build a supervisor AI Agent that routes ticket requests to a ticket specialist, calendar requests to a calendar specialist, and HR questions to an HR specialist — all on one n8n canvas.
- **Production self-hosted:** Use the n8n self-hosted AI starter kit (Docker Compose with Postgres, Redis, Qdrant, Ollama) for a fully offline, data-private deployment.
