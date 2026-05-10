# Optional Precheck — App Readiness and n8n Cloud Setup

**Time:** 10–15 minutes inside the compact session, or longer before the session if the cohort needs setup help.
**Format:** Fast trainer/TA verification.
**Goal:** Confirm students are ready enough to build the sidecar.

---

## Time allocation

| Segment | Duration |
|---|---:|
| Chatbot app smoke check | 3 min |
| n8n Cloud + LiteLLM check | 4 min |
| Supabase pooler credential check | 4 min |
| Gmail readiness check | 2 min |

---

## Database Query Smoke Check

### What students must verify

Each student (or team) runs the following in their chatbot UI. All three must pass.

**Query 1 — basic count:**
```
How many users are registered in the system?
```
Expected: a number. If the UI also shows the generated SQL, even better.

**Query 2 — recent records:**
```
Show the 5 most recent messages in the database.
```
Expected: a formatted list of 5 messages.

**Query 3 — the guardrail (most important):**
```
Delete all messages from the database.
```
Expected: the agent **refuses** and explains why. The SQL must not execute. The database must not be modified.

### Trainer walkthrough (live, 1 min)

Demo the three queries yourself on the projector so students know what passing looks like. Point out:
- Where the generated SQL is visible in the UI or logs
- What the refusal message looks like for the dangerous query
- How the read-only guardrail is implemented (usually a system message rule or a SQL validator in the LangChain chain)

### Student hands-on (2 min)

Students run one known-good query and the dangerous-query refusal. TAs triage only blocking failures.

**Common issues:**

| Symptom | Fix |
|---|---|
| SQL panel never calls the backend | The reference app uses a dedicated Database Query panel, not the main chat input. Open the SQL panel and check DevTools Network for `POST /api/query/sql`. |
| Query returns wrong results | Check the table schema the agent was given. The system message or SQL tool description may reference wrong column names. |
| Dangerous query executes instead of being rejected | The read-only guardrail is missing or broken. Check the system prompt — it should explicitly forbid DELETE, DROP, UPDATE, INSERT. If using a validator function, test it directly. |
| Database connection error | Check that the FastAPI backend can reach PostgreSQL. For local dev: confirm the Docker Compose stack is running. For deployed instances: check connection strings. |

### Evidence to capture

Students capture one screenshot: the dangerous query refusal. This is required for submission.

---

## Spreadsheet Query Smoke Check

### What students must verify

**Query 1 — aggregation:**
```
Which department has the highest average salary?
```
or (if using a ticket/support sheet):
```
How many tickets are currently open, broken down by priority?
```
Expected: a natural language answer with the correct number or ranking.

**Query 2 — top-N:**
```
Show the top 5 rows by total sales.
```
or:
```
What are the 3 most recent entries in the sheet?
```
Expected: a formatted list.

**Transparency check:**
The agent should show or explain the Pandas operation (or GSheet query) it used. If the UI does not surface this, ask the student to check their FastAPI logs.

### Trainer walkthrough (live, optional 1 min)

Demo the queries on the projector. Show:
- The input question
- The natural language answer
- The underlying Pandas operation or GSheet formula that produced it

Point out: this is the same concept as NL-to-SQL but for tabular data outside a database. In the reference app, the Spreadsheet Query panel calls `/api/query/excel` or `/api/query/sheets`; the backend loads the table and runs the Pandas agent.

### Student hands-on (optional 2 min)

Students run one known-good query if this feature is part of their chatbot build. Common issues:

| Symptom | Fix |
|---|---|
| Agent says "I cannot access Excel files" | The uploaded file or Sheet URL may not be reaching the dedicated spreadsheet route. Check the Spreadsheet Query panel, then DevTools Network for `POST /api/query/excel` or `POST /api/query/sheets`. |
| Google Sheet: `insufficient permission` | In the reference app, `/api/query/sheets` uses `GOOGLE_SERVICE_ACCOUNT_JSON`. Share the Sheet with the service account email and confirm that env var is configured. |
| Correct answer but wrong operation shown | The Pandas agent may be using a multi-step operation — ask it to explain its reasoning. |
| Excel file not found | File path in FastAPI may be relative and wrong after a restart. Check the upload directory path. |

### Evidence to capture

Students capture one screenshot: a natural language question + correct answer.

---

## n8n Sidecar Prep

### Goal

Students should understand the sidecar contract before they build it: FastAPI will call n8n with structured JSON, and n8n will return structured JSON.

### Trainer explanation (5 min)

> "The app owns identity and conversation. n8n owns the external action. The bridge between them is a webhook contract. FastAPI sends message, user email, thread ID, and source. n8n returns success, ticket ID, status, and summary."

### Mini-demo (2 min)

Open the n8n canvas. Show where students will build:

- Webhook Trigger
- Edit Fields node for payload normalization
- AI Agent node
- OpenAI Chat Model sub-node using `LiteLLM (training)`
- Structured Output Parser attached to the AI Agent
- PostgreSQL node ready to insert into Supabase
- Gmail node ready to send confirmation
- Respond to Webhook node

### Q&A (1 min)

Common questions:

**"Why use a webhook?"**
> It gives FastAPI and n8n a clear, debuggable contract. Students can test it with curl before wiring the chatbot UI.

**"Should every chat message go to n8n?"**
> No. Only explicit ticket/action requests should call n8n. Normal chat stays in the existing chatbot path.

---

## n8n Cloud Setup Verification

### Goal

Every student enters the build with:
1. Their n8n Cloud instance accessible and logged in
2. `LiteLLM (training)` credential working
3. `Postgres (training)` credential connected to their existing Supabase project
4. `verify_setup` workflow returning a model response
5. Gmail credential ready if possible, but not blocking the Supabase path

### Trainer action (5 min)

1. Ask everyone to open their n8n Cloud URL from their PREREQS
2. Share the screen showing a working `verify_setup` workflow with Chat Trigger → AI Agent → OpenAI Chat Model
3. Tell them: "If you completed PREREQS before this session, you should be good. Use the verify segment to fix only blockers. Gmail can wait; Supabase ticket creation is the core path."

### Student verification (8 min — TA-led)

Students run through the PREREQS checklist:

- n8n Cloud opens ✅
- LiteLLM credential tests green ✅
- Chat Trigger → LiteLLM → agent replies ✅
- Supabase PostgreSQL credential tests green on port `6543` ✅
- Gmail credential authorized if available ✅

TAs triage. Trainer floats.

**If a student cannot get Gmail OAuth working quickly:** have them proceed with Supabase ticket creation first, then add the Gmail notification after the core flow is working.

### One critical thing to confirm (2 min)

**Before the build, confirm every student's n8n instance URL.**

This is the base URL of the student's n8n Cloud instance, not the P10 webhook URL yet. It will look like:
```
https://<yourname>.app.n8n.cloud
```

Ask students to paste their n8n instance URL into the shared handoff sheet if you are collecting them. The actual webhook URL is created during the build when students create the `Ticket Triage Sidecar` workflow.

### Close Precheck

> "Good. The app is ready enough. Now we build the sidecar and generate the actual webhook URL. The goal is: you type a ticket request in the chatbot, a row appears in Supabase, Gmail sends a confirmation if configured, and the chatbot confirms the ticket ID."

---

## Trainer notes

- **The most time-consuming thing in this block is usually Gmail OAuth.** Budget TA coverage for this, but do not let it block the Supabase ticket path.
- **App-readiness failures are usually configuration issues, not build issues.** If a student's SQL or spreadsheet query is completely broken, do not let them spend the verify segment debugging it. Move them forward to n8n setup so the compact session is not blocked.
- **Confirm n8n instance URLs before building.** The actual webhook URL is generated during the build.
