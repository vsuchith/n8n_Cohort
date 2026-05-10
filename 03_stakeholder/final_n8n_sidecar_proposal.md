# Final Proposal: AI Chatbot Product + n8n Sidecar Automation Agent

**Audience:** Amzur AI Chatbot Cohort / Trainers / Project Stakeholders  
**Context:** Final project direction after the chatbot implementation  
**Recommended Decision:** Keep the full-stack chatbot product track intact and add **n8n Sidecar Automation Agent** as the final extension.

---

## 1. Executive Summary

The cohort already has a strong full-stack AI chatbot course implemented across nine incremental projects. These projects build the actual AI product layer: React UI, FastAPI backend, PostgreSQL persistence, authentication, Google OAuth, chat threads, memory, attachments, image generation, PDF RAG, NL-to-SQL, and NL-to-Excel/GSheet.

The recommended next step is **not** to replace this product with n8n. Instead, n8n should be introduced as a **sidecar automation engine** after the chatbot is complete.

In this model:

- **The chatbot track builds the AI product.**
- **The n8n extension connects the product to real-world business workflows.**
- **LangChain / LiteLLM handles product reasoning.**
- **n8n handles external actions, integrations, notifications, approvals, and workflow automation.**

The final project should be titled:

> **n8n Sidecar Automation Agent**

The capstone story becomes:

> “The chatbot is now a product. n8n is now its automation engine.”

---

## 2. Why This Direction Is Recommended

The cohort may ask:

> “If n8n can build a chatbot or agent, why did we build React + FastAPI + LangChain?”

The answer is:

> **n8n is excellent for workflows. The full-stack application is needed for a product.**

The full-stack chatbot owns:

- Custom user experience
- Login and Google OAuth
- User identity
- Chat threads
- Persistent message history
- File uploads
- RAG lifecycle
- NL-to-SQL safety
- Excel/GSheet querying
- Permissions
- API boundaries
- Product-grade frontend and backend logic

n8n owns:

- Workflow automation
- Notifications
- External integrations
- Business process orchestration
- Approvals
- Scheduled jobs
- Event-triggered jobs
- Low-code operational workflows

Therefore, the correct production framing is:

> **Build the app when you need a product. Use n8n when you need automation. Use both when the product needs to act across business systems.**

---

## 3. Final Recommended Architecture

```text
User
 ↓
React Chatbot UI
 ↓
FastAPI Backend
 ↓
Product routes / panels
 ├── Chat via LangChain / LiteLLM
 ├── Conversational Memory
 ├── PDF RAG
 ├── NL-to-SQL via /api/query/sql
 ├── NL-to-Excel / GSheet via /api/query/excel or /api/query/sheets
 └── Automation via /api/automations/ticket
        ↓
FastAPI calls n8n Webhook
        ↓
n8n AI Agent
        ↓
PostgreSQL / Email / Slack / Teams / Calendar / Jira
        ↓
Response back to FastAPI
        ↓
React Chatbot displays result
```

---

## 4. Layer Responsibilities

| Layer | Responsibility |
|---|---|
| React | Product UI, chat experience, panels, file upload, thread sidebar |
| FastAPI | API boundary, auth, sessions, routing, product logic |
| PostgreSQL | Source of truth for users, threads, messages, attachments, query logs |
| LangChain / LCEL | Chat chain, memory, RAG, SQL agent, spreadsheet agent |
| LiteLLM | LLM gateway and model routing to Gemini/OpenAI/etc. |
| ChromaDB | Vector store for PDF RAG |
| n8n | Workflow automation, notifications, approvals, external system actions |

---

## 5. The Chatbot Product Remains Mandatory

The completed product track should remain mandatory. It gives students a real application before n8n is introduced.

| Capability | Product Role |
|---|---|
| Chatbot UI and backend | LLM-connected product surface |
| Persistent chat + login | PostgreSQL, bcrypt, JWT, protected routes |
| Google OAuth + threads | OAuth, account linking, thread CRUD, auto-naming |
| Conversational memory | Thread-aware conversation context |
| Multi-modal attachments | File handling and rich inputs |
| Image generation | Dedicated image generation endpoint |
| PDF retrieval | ChromaDB + embeddings + retrieval |
| Database query | Read-only SQL agent over PostgreSQL |
| Spreadsheet query | Pandas/GSheet agent over spreadsheet data |

These projects create the actual AI product. n8n should not replace them.

---

## 6. New Final Extension: n8n Sidecar Automation Agent

### 6.1 Project Goal

Extend the completed chatbot so it can trigger real-world business workflows through n8n.

### 6.2 User Story

```text
As an employee,
I want to ask the chatbot to create a support ticket,
so that the issue is recorded and the right team is notified automatically.
```

### 6.3 Business Scenario

User asks inside the chatbot:

```text
Create a high priority ticket: my VPN is not working since morning.
```

The chatbot backend sends this request to n8n. n8n creates a ticket, optionally sends notifications, and returns a structured result.

---

## 7. P10 Workflow Design

### 7.1 FastAPI → n8n Request

FastAPI sends a structured request to the n8n webhook:

```json
{
  "workflow": "create_support_ticket",
  "user_email": "employee@amzur.com",
  "thread_id": "thread-123",
  "message": "Create a high priority ticket: my VPN is not working since morning",
  "source": "ai_forge_chatbot"
}
```

### 7.2 n8n Workflow

```text
Webhook Trigger
   ↓
n8n AI Agent
   ├── Chat Model
   └── Structured Output Parser
          ↓
       PostgreSQL Insert into Supabase
   ↓
Gmail confirmation
   ↓
Respond to Webhook
```

### 7.3 n8n AI Agent Responsibilities

The n8n AI Agent should be a **specialist workflow agent**, not a general chatbot.

It should only handle:

- Extracting issue description
- Inferring category
- Inferring priority
- Creating ticket
- Returning structured result
- Optionally drafting notification text

It should not handle:

- General conversation
- Full chat memory
- PDF RAG
- NL-to-SQL over the product database
- Excel/GSheet agent logic
- User authentication
- Thread management

Those belong to the main application.

### 7.4 n8n Response

n8n returns:

```json
{
  "success": true,
  "ticket_id": "TKT-1024",
  "category": "IT Support",
  "priority": "high",
  "assigned_team": "IT Support",
  "status": "open",
  "summary": "Created TKT-1024 | IT Support | high | Team: IT Support | Status: Open"
}
```

### 7.5 Chatbot Final Response

The chatbot displays:

```text
Created TKT-1024 | IT Support | high | Team: IT Support | Status: Open
```

---

## 8. Why There Can Be Two Agents

Yes, there can be an agent inside the product and another agent inside n8n.

The key is that they must have different responsibilities.

### 8.1 Product AI Layer

The current `amzur-ai-chat` reference implementation uses explicit FastAPI routes and React panels for the product AI capabilities.

It handles:

- Normal chat
- Memory
- RAG
- SQL questions
- Excel/GSheet questions
- P10 automation through `POST /api/automations/ticket`

Example:

```text
User: Create a high priority IT ticket because VPN is not working.
Product route: Authenticated user requested ticket automation. Call n8n workflow.
```

### 8.2 n8n Agent

The n8n agent executes the workflow.

It handles:

- Extracting workflow fields
- Classifying category
- Deciding priority
- Assigning an owning team
- Writing a next action
- Calling workflow tools
- Returning a structured result

Example:

```text
n8n agent: category = IT Support, priority = high, assigned_team = IT Support, next_action = Check VPN access logs.
```

### 8.3 Important Rule

Avoid:

```text
Agent talks to agent with no contract.
```

Prefer:

```text
Product route calls workflow with structured input/output.
```

The contract between FastAPI and n8n should be explicit.

---

## 9. n8n On Canvas vs n8n In Production

### 9.1 n8n On Canvas

In training/demo mode, n8n usually uses:

- Manual Trigger
- Chat Trigger
- Simple Memory
- PostgreSQL/Supabase
- Personal credentials
- Minimal error handling
- Little/no versioning
- One user testing

This is good for learning.

### 9.2 n8n In Production

In production, n8n should use:

- Webhook triggers from backend
- Environment-specific credentials
- Error workflows
- Retry policies
- Logging and monitoring
- Workflow versioning
- Queue mode
- Restricted credentials
- Human approval where needed
- Separate dev/stage/prod workflows
- Secured inbound webhook authentication
- Structured request/response contracts

### 9.3 Key Message to Students

> “Today we may build n8n on canvas to understand the automation. In production, the same workflow would be triggered by the backend, secured, versioned, monitored, and deployed as an automation service.”

---

## 10. Standalone n8n vs Sidecar n8n

| Option | Use Case | Recommendation |
|---|---|---|
| Standalone n8n chatbot | Quick internal demo, ops assistant, prototype | Useful for learning, not the final product architecture |
| n8n as sidecar | Product triggers workflows through webhooks | Recommended for this cohort |
| n8n replacing app | Build everything inside n8n | Not recommended after a full product build |

Because the chatbot product is already complete, standalone n8n would confuse the story. Sidecar n8n strengthens the story.

---

## 11. Session Scope

The sidecar module is designed for a compact 90–120 minute delivery after students already have the chatbot working.

```text
Frame:    5–10 min
Verify:   10–15 min
Build:    60–75 min
Validate: 15–20 min
```

The session should not attempt multiple deep projects. It should be a focused integration module.

---

## 12. Compact Agenda

### 5–10 min — Framing

Explain:

```text
The chatbot track built the AI product.
n8n adds the production automation sidecar.
```

Show final architecture.

---

### 10–15 min — Readiness Check

Students verify the minimum prerequisites are ready.

Required demo:

- n8n Cloud instance is accessible
- LiteLLM credential works
- Supabase PostgreSQL credential works through the pooler
- Gmail credential works if available
- `verify_setup` workflow passes

Do not spend the session debugging old chatbot features. If Gmail is blocked, continue with Supabase ticket creation first.

---

### 60–75 min — n8n Sidecar Build

Build the actual sidecar workflow.

Minimum integration:

```text
FastAPI endpoint → n8n webhook → n8n AI Agent → Supabase ticket → Gmail confirmation → response
```

Backend endpoint:

```text
POST /api/automations/ticket
```

n8n workflow:

```text
Webhook
 ↓
AI Agent
 ↓
PostgreSQL Insert
 ↓
Respond to Webhook
```

---

### 15–20 min — Integration Testing

Each team tests:

1. User asks chatbot to create ticket
2. Backend calls n8n webhook
3. n8n creates ticket
4. Chatbot displays ticket ID

---

### Optional Short Demo

Demo order:

1. Ask a PostgreSQL question
2. Ask a spreadsheet question
3. Create a ticket through the n8n sidecar

---

## 13. Minimum Implementation Details

### 13.1 Backend Endpoint

```text
POST /api/automations/ticket
```

Input:

```json
{
  "message": "Create a high priority ticket: VPN is not working",
  "thread_id": "optional-thread-id"
}
```

Backend enriches with authenticated user:

```json
{
  "user_email": "employee@amzur.com",
  "thread_id": "optional-thread-id",
  "message": "Create a high priority ticket: VPN is not working",
  "source": "ai_forge_chatbot"
}
```

Then it calls the n8n webhook.

### 13.2 Supabase Ticket Table

Columns:

```text
ticket_id
user_email
issue
category
priority
status
created_at
thread_id
assigned_team
next_action
```

### 13.3 n8n PostgreSQL Fields

If using the PostgreSQL node after the n8n AI Agent:

```text
ticket_id       = generated timestamp or sequence
user_email      = webhook input
issue           = AI Agent structured output issue
category        = AI Agent structured output category
priority        = AI Agent structured output priority
status          = "open"
created_at      = now()
thread_id       = webhook input
assigned_team   = AI Agent structured output assigned_team
next_action     = AI Agent structured output next_action
```

### 13.4 System Message for n8n AI Agent

```text
You are a specialist ticket automation agent.

Your job is to create support tickets from user requests.

Rules:
1. Extract issue, category, priority, assigned_team, next_action, and summary.
2. If priority is not explicit, infer it as low, medium, high, or critical.
3. If the issue blocks work, use high priority.
4. If the issue affects a client demo, production outage, or security concern, use critical priority.
5. Return structured output that the PostgreSQL node can insert into Supabase.
6. Return a concise confirmation after the workflow succeeds.
7. Do not answer general chatbot questions. This workflow is only for ticket creation.
```

---

## 14. Student Deliverables

Each team/student should submit:

1. Database query screenshot: question + answer + generated SQL
2. Dangerous database query rejected
3. Spreadsheet query screenshot: question + answer + operation used
4. n8n workflow screenshot or exported JSON
5. Chatbot screenshot showing ticket creation via n8n
6. Short final demo video or live demo

---

## 16. What To Cut From Final Day

To keep the day realistic, do not attempt:

- Full standalone n8n chatbot
- n8n RAG
- n8n multi-agent research assistant
- Complex UI polish
- Complex alternate datastore setup if not ready
- Complex human approval workflow
- Slack/Teams integration unless credentials are ready

These are useful extensions but not necessary for the final class.

---

## 17. Optional Stretch Items

If students finish early:

1. Add email notification from n8n
2. Add Slack/Teams notification
3. Add ticket status lookup workflow
4. Add human approval before ticket creation
5. Add separate `ticket_status` n8n workflow
6. Rotate and harden the webhook authentication secret
7. Add logging of n8n response into the app database

---

## 18. Handling Common Student Objections

### Objection 1: “Why not just use n8n for everything?”

Answer:

```text
n8n can build quick internal agents, but it is not the best place to build a full product experience.
Our product needs login, OAuth, user-owned threads, persistent chat history, file handling, RAG, SQL safety, and a custom UI.
n8n is best used for workflows, notifications, approvals, and integrations.
```

### Objection 2: “Why does n8n also have an agent?”

Answer:

```text
The product layer owns the user context and decides when to call the automation route.
The n8n agent executes one specialist workflow.
They are not duplicates.
They are layered agents with different responsibilities.
```

### Objection 3: “Can n8n be standalone in production?”

Answer:

```text
Yes, for internal workflows, admin tools, operational assistants, and prototypes.
But for a customer-facing or product-grade chatbot with users, permissions, threads, and custom UI, a full-stack app is stronger.
```

### Objection 4: “Why call n8n through webhook?”

Answer:

```text
The webhook creates a clean contract between the product and workflow engine.
FastAPI sends structured input.
n8n performs the workflow.
n8n returns structured output.
This keeps product logic and workflow automation separate.
```

---

## 19. Final Messaging for Management

Use this summary:

> “The first nine projects build a production-style AI chatbot application. The final n8n project demonstrates how such a product connects to real-world enterprise workflows. n8n is introduced as a sidecar automation agent, not as a replacement for the application. This reflects a realistic production pattern: the app owns users, data, memory, RAG, SQL, and UI; n8n owns actions, integrations, notifications, approvals, and workflow orchestration.”

---

## 20. Final Recommendation

Approve the following structure:

```text
Mandatory full-stack AI chatbot product track
n8n Sidecar Automation Agent
```

Final capstone title:

> **AI Chatbot + n8n Sidecar Automation: From Answering Questions to Taking Business Actions**

Final outcome:

By the end of the cohort, students can demonstrate:

1. A working AI chatbot product
2. Persistent user chat history and threads
3. Memory-aware conversation
4. PDF RAG
5. NL-to-SQL
6. NL-to-Excel/GSheet
7. n8n sidecar workflow triggered from the chatbot
8. A real business action completed from chat

This is the strongest and most coherent proposal because it preserves the value of the existing nine projects and gives n8n a realistic production role.
