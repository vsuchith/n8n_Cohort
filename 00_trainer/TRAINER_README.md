# Trainer README — n8n P10 Training Package

> **You are the trainer.** This file tells you what everything is and how to run the compact 90–120 minute sidecar session. Read this first.

---

## What this package is

This is the complete training package for **P10 — the n8n sidecar**. It is a compact 90–120 minute session for engineers who have already built the reference chatbot (`ai-forge-chatbot/amzur-ai-chat`). By the end, every student has wired that chatbot to an n8n Cloud workflow that creates real Supabase tickets and sends Gmail confirmations from natural language chat.

The package serves two audiences:
- **You (the trainer):** session scripts, pitch notes, troubleshooting guides, infra setup
- **Students:** a self-contained implementation guide (`P10_N8N.md`) they can follow autonomously or hand to Claude/Copilot

---

## File map

### Trainer files (you read these)

| File | What it is | When to use |
|---|---|---|
| `TRAINER_README.md` | This file — orientation and run-of-show | Read first |
| `TRAINER_PITCH.md` | Optional opening pitch script + Q&A prep | Use only if you have extra time |
| `S_FRAMING.md` | Optional sidecar mental model | Start of session |
| `S_CHECKPOINTS.md` | Optional readiness check | Before build |
| `S_P10_BUILD.md` | Core build + student hands-on | Main session |
| `S_DEMO.md` | Compact validation + demo format | End of session |
| `PRODUCTION.md` | Post-session reference — production deployment path | Share after demo |

### Student files (students read these)

| File | What it is | When students get it |
|---|---|---|
| `PREREQS.md` | Pre-session n8n Cloud setup | Shared before the session |
| `P10_N8N.md` | Core P10 implementation guide — Supabase tickets + Gmail + bi-directional status update | Shared during the build |
| `P10_ADVANCED.md` | Advanced module — Intent Router (Switch node, meeting + digest sub-workflows) | Share only to students who finish core early |

---

## Compact Session Timeline

| Segment | Duration | Trainer action | File |
|---|---:|---|---|
| **Frame** | 5–10 min | Explain sidecar boundary and target workflow | `S_FRAMING.md` |
| **Verify** | 10–15 min | Confirm n8n Cloud, LiteLLM, Supabase pooler, Gmail readiness | `S_CHECKPOINTS.md` |
| **Build** | 60–75 min | Build n8n workflow and wire FastAPI/React | `S_P10_BUILD.md` |
| **Validate** | 15–20 min | Run ticket creation + normal chat checks | `S_DEMO.md` |

---

## Trainer pre-session checklist

Do these before the session. Failures here block the compact delivery.

### Infrastructure (before session)

- [ ] LiteLLM proxy is running and accessible at `litellm.amzur.com` (VPN required)
- [ ] `gpt-4o` and `text-embedding-3-small` models are enabled in the LiteLLM config
- [ ] You have tested the API key students will use: `curl -X POST https://litellm.amzur.com/v1/chat/completions` should return a response

### Your own n8n instance (before session)

- [ ] Your n8n Cloud trial is active at `https://<yourname>.app.n8n.cloud`
- [ ] `LiteLLM (training)` credential saved, connection test green
- [ ] Supabase PostgreSQL credential tested through the pooler on port `6543`
- [ ] Gmail credential authorized and tested
- [ ] `Ticket Triage Sidecar` workflow **fully built and working** on your instance — you will live-build this during the core build and students follow along. Build it yourself first.
- [ ] `Ticket Status Notifier` workflow built and Active on your instance — this is the bi-directional status update workflow (3 nodes: Webhook → Gmail → Respond to Webhook)
- [ ] Your Supabase `tickets` table exists with the required columns
- [ ] You have tested the full curl → n8n → Supabase → Gmail flow on your instance
- [ ] You have tested the status update: `PATCH /api/automations/ticket/{id}/status` updates the Supabase row and triggers the notification email

### Shared resources

- [ ] Shared Google Sheet for student deliverables is open for editing
- [ ] Student n8n instance URL collection column is in the shared sheet
- [ ] `PREREQS.md`, `P10_N8N.md` links shared in the training Slack channel

### Student prerequisites

- [ ] Students were sent `PREREQS.md` before this session and have been asked to complete it
- [ ] TAs are briefed: common issues are Supabase pooler settings and Gmail OAuth (`redirect_uri_mismatch`, test users not added) — see `PREREQS.md` troubleshooting section
- [ ] If >25% of students have not completed PREREQS: spend 10–15 minutes on setup triage and make Gmail optional

---

## The two delivery modes

This package supports two ways for students to work on P10. You decide which to use based on your cohort.

### Mode 1 — Trainer-led (default, recommended for first run)

You build the n8n workflow on screen while students follow along on their own instances. Then students wire up FastAPI and React hands-on while you and TAs float.

Use: `S_P10_BUILD.md` as your script.

### Mode 2 — Student autonomous (advanced cohorts, or async)

Students receive `P10_N8N.md` and implement P10 independently — with or without Claude/Copilot. The trainer is available for questions but does not live-build on screen.

Use: Share `P10_N8N.md` at the start of the build. You may still do brief framing live.

### Hybrid (recommended for a 90–120 minute session)

- Trainer gives 5 minutes of framing.
- Trainer verifies readiness quickly.
- Students use `CLAUDE.md` and `P10_N8N.md` with Claude/Copilot for the code sections.
- Trainer and TAs focus on n8n browser workflow, webhook URLs, and integration errors.

---

## Key things to communicate during the session

**At the start of the build:**
> "Open `P10_N8N.md`. This is your implementation guide. It has the full n8n workflow configuration, the exact FastAPI files to create, and the exact React changes. You can follow it manually or give the whole file to Claude/Copilot and let the agent implement the code sections. The n8n steps need to be done manually in the browser."

**At the end (the key takeaway):**
> "What you just built is the pattern. Replace the PostgreSQL node with Jira, ServiceNow, Salesforce, or Slack — the architecture is identical. n8n has 400+ of these connectors. The agent extracts the structured decision; the workflow executes the business action."

---

## Common session problems and fixes

| Problem | Fix |
|---|---|
| Many students did not complete PREREQS | Use the 10–15 minute verify segment for triage. Prioritise: n8n account → LiteLLM credential → Supabase PostgreSQL credential. Keep Gmail optional so the core Supabase ticket path still fits the session. |
| Student's n8n Test URL returns 404 | They are not clicking "Listen for test event" on the Webhook node before sending the curl. Remind them this is required for test mode. |
| AI Agent runs but no ticket row | PostgreSQL credential, table name, or column mapping is wrong. Confirm the Supabase pooler credential and the `tickets` table. |
| Respond to Webhook returns empty body | Expression references wrong node name. Node names are case-sensitive in n8n expressions. `$('Normalize Payload')` must match the canvas node name exactly. |
| FastAPI 401 from n8n | Header Auth secret in n8n does not match `N8N_API_KEY` in FastAPI `.env`. |
| Student is on Production URL before activating | Remind: Test URL = only works when "Listen for test event" is active. Production URL = only works when workflow is toggled Active. |
| React chatbot not calling n8n at all | Check DevTools Network for `POST /api/automations/ticket`. Most likely cause: the TICKET_INTENT regex is not matching the student's test phrase, or the `automationApi` import is missing. |
| Student has refactored into a LangGraph agent | They can register the endpoint as a tool. That is fine — but it is optional and should not block the core demo. |

---

Students submit screenshots + n8n workflow JSON export to the shared Google Sheet after the demo.
