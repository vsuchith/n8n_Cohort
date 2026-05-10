# Trainer Handbook — n8n Sidecar Integration

> **Purpose:** This handbook gives trainers the delivery model for introducing n8n into the existing chatbot course as a continuation, not as a replacement app.

---

## Training Story

Students already have a working AI chatbot product. It has a real frontend, backend, authentication, persistence, retrieval, query surfaces, and an established repository structure.

The n8n session adds one missing production capability:

> The chatbot can now take a business action outside itself.

The action for the session is support ticket triage: create a ticket, assign an owning team, and write the next action. The same pattern applies to Jira, ServiceNow, Slack, Salesforce, email, calendar actions, approval workflows, or database writes.

The core message for trainers:

> React and FastAPI own the product. n8n owns external workflow execution.

---

## Proposed Integration Plan

Use this sequence when explaining the day:

1. **Frame the product boundary.**
   The chatbot owns user identity, thread context, product UI, and backend APIs.

2. **Frame the sidecar boundary.**
   n8n receives a structured request, performs one external action, and returns a structured response.

3. **Build the n8n workflow manually.**
   Students create a Webhook → Normalize Payload → AI Agent with Structured Output → PostgreSQL Insert → Gmail Send → Respond to Webhook workflow. The AI Agent extracts issue, category, priority, assigned team, and next action.

4. **Add a FastAPI automation endpoint.**
   The endpoint uses the existing auth cookie, enriches the payload with the authenticated user's email, and calls n8n.

5. **Add a React automation branch.**
   The normal chat input recognizes explicit ticket requests and calls the automation endpoint.

6. **Run end-to-end tests.**
   The trainer verifies the live path from chatbot input to Supabase ticket row, Gmail confirmation, and chatbot confirmation.

---

## What Trainers Give Students

Share these files in this order:

| When | File | Purpose |
|---|---|---|
| Before session | `01_student/PREREQS.md` | Students create n8n Cloud account and verify credentials. |
| Start of build | `01_student/CLAUDE.md` | Updated drop-in coding-agent instruction file for the chatbot repo with the n8n continuation included. |
| During build | `01_student/STUDENT_WORKFLOW.md` | Human-readable workflow checklist for the session. |
| As needed | `01_student/P10_N8N.md` | More detailed copy-paste implementation reference. |

`CLAUDE.md` is for Claude/Copilot as the updated full instruction file. `STUDENT_WORKFLOW.md` is for students and TAs to follow visually.

---

## Delivery Modes

### Trainer-Led

Use this for the first cohort or mixed-experience groups.

- Trainer builds the n8n workflow on screen.
- Students mirror the workflow in their own n8n instances.
- Students then use the updated `CLAUDE.md` to implement the FastAPI and React changes.
- TAs debug setup and wiring.

### Student-Led

Use this for experienced cohorts.

- Trainer gives the architecture framing.
- Students receive the updated `CLAUDE.md` and `STUDENT_WORKFLOW.md`.
- Students build independently with Claude/Copilot.
- Trainer and TAs verify the final working flow.

### Hybrid

Recommended default:

- Trainer demonstrates the n8n workflow once.
- Students build their own workflow manually.
- Students use the updated coding-agent instructions for app integration.
- Final testing is done live with trainer/TAs.

---

## If The n8n Workflow Already Exists

Sometimes the trainer or platform team may provide a completed n8n Cloud workflow. In that case, students do not need to build the workflow from scratch. They only integrate the chatbot with the existing webhook contract.

The trainer should give students:

- The Production Webhook URL
- The Header Auth secret name and value
- The request fields the workflow expects
- The response fields the workflow returns
- A sample successful request and response

The integration work is then:

1. Add backend environment values for the webhook URL and secret.
2. Add a FastAPI automation route that uses the existing authenticated user.
3. Have FastAPI send the user's message, email, thread ID, and source to n8n.
4. Add a React API helper for the automation route.
5. Add a chat UI branch that calls the route only for explicit ticket/action requests.
6. Display the returned summary as the assistant response.
7. Confirm ordinary chat messages still use the normal chatbot path.

Trainer note:

> "If the workflow is already built, the class focus shifts from building n8n nodes to understanding the contract between the product and the workflow engine. The important part is still the same: the app owns identity and conversation; n8n owns the external action."

---

## Trainer Runbook

### Before Class

- Confirm students can access the chatbot repo.
- Confirm the chatbot app runs locally for at least one trainer machine.
- Confirm n8n Cloud access.
- Confirm `LiteLLM (training)` credential works in n8n.
- Confirm Supabase PostgreSQL credential works in n8n.
- Confirm Gmail credential works in n8n.
- Prepare the `tickets` table migration in the same Supabase project used by the chatbot.
- Build and test the full workflow once before the session.

### During Framing

Say this clearly:

> "We are not moving the chatbot into n8n. We are adding n8n as an external workflow executor. The app decides when an action is needed. n8n performs that action."

Draw this:

```text
React Chat
  ↓
FastAPI automation route
  ↓
n8n Webhook
  ↓
n8n Agent + PostgreSQL Insert + Gmail
  ↓
Structured JSON response
  ↓
Chatbot confirmation
```

### During Build

The trainer should watch for these exact mistakes:

- Student uses n8n Chat Trigger instead of Webhook Trigger.
- Student uses the Webhook Test URL after activating the workflow.
- Student forgets Header Auth.
- Student uses the direct Supabase connection instead of the pooler on port `6543`.
- Student maps PostgreSQL fields from the wrong upstream node.
- Student forgets to connect the Structured Output Parser to the AI Agent.
- Student uses the Gmail node before the PostgreSQL insert succeeds.
- Student adds a new auth scheme in FastAPI instead of `get_current_user`.
- Student forwards JWT/session data to n8n.
- Student sends all chat messages to n8n.

### During Final Demo

Ask students to show:

1. The chatbot input.
2. DevTools Network call to `/api/automations/ticket`.
3. n8n execution success.
4. Supabase `tickets` row.
5. Gmail confirmation.
6. Chatbot confirmation with ticket ID.
7. A normal non-ticket chat message that does not call n8n.

---

## Proposed Student Workflow

Students should move through the work in this order:

1. Verify n8n Cloud and credentials.
2. Create the Supabase `tickets` table.
3. Build and test the n8n workflow with curl.
4. Activate the workflow and copy the Production URL.
5. Add backend env vars and FastAPI automation files.
6. Register the automation router.
7. Add the frontend API helper.
8. Add non-streaming chat settlement.
9. Add the ticket-request branch in `ChatPage`.
10. Restart backend/frontend.
11. Test ticket creation from the chatbot.
12. Test a normal chat message to prove no regression.
13. Export the n8n workflow JSON.
14. Submit screenshots and demo.

---

## Trainer Language For Common Questions

**"Why not build the whole chatbot in n8n?"**

> "Because this is already a product with users, sessions, permissions, persistent threads, custom UI, and backend APIs. n8n is excellent for workflows. It should execute the external action, not replace the product."

**"Why does n8n have an AI Agent too?"**

> "The product owns the conversation. The n8n agent is a specialist that extracts ticket fields and calls one tool. They are not doing the same job."

**"We already have an LLM API call or agent in the app. Why not integrate the tools directly there?"**

> "For one or two product-owned tools, direct integration in FastAPI or LangChain is fine. The reason we introduce n8n is that business actions usually become workflows: validate the request, classify it, write to a system, send a Slack or email notification, handle retries, alert on failure, maybe add human approval for critical cases, and later swap the destination to Jira or ServiceNow. That is operational workflow logic. Keeping it in n8n gives us connectors, credential management, execution logs, retries, and a visual flow the team can inspect. Product tools stay in the app; cross-system business workflows move to n8n."

**"Can LangChain or LangGraph handle agent workflows with any number of tools?"**

> "Yes. LangChain and LangGraph can absolutely orchestrate agents with many tools. n8n is not here because LangChain cannot do it. n8n is here because business workflow automation has concerns beyond agent reasoning: SaaS credentials, connectors, retries, execution history, operational visibility, approvals, notifications, and workflows that ops or business teams can inspect. If your team wants every integration in Python and is ready to own all API clients, retries, credentials, observability, and workflow changes in code, LangGraph is valid. In this course, we are showing a different production pattern: keep product intelligence in the app, and move cross-system business actions into a workflow engine."

**"Should n8n know who the user is?"**

> "Only as structured payload data like `user_email`. It should not receive tokens, cookies, or session state."

## Completion Definition

The session is complete when a student can demonstrate:

```text
Chatbot request
  → FastAPI automation endpoint
  → n8n workflow
  → Supabase ticket row with triage fields
  → Gmail confirmation
  → chatbot confirmation
```

and also demonstrate that normal chatbot messages still use the original product path.
