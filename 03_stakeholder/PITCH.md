# n8n Sidecar: From Answering Questions to Taking Business Actions

> **Audience:** Management, project stakeholders, cohort sponsors
> **Format:** 1-page brief + architecture reference
> **Context:** Delivered after the chatbot product is complete, at the start of the n8n sidecar session

---

## The story in one line

> "The chatbot understands your business. The n8n sidecar makes it act on it."

---

## What the chatbot delivered

Nine incremental projects produced a full-stack AI chatbot product:

- React UI with chat threads, file upload, and conversation history
- FastAPI backend with JWT auth and Google OAuth
- PostgreSQL for persistent users, threads, and messages
- LangChain/LCEL flows for chat, PDF RAG, NL-to-SQL, and NL-to-Excel/GSheet
- LiteLLM as the LLM gateway (model-agnostic, cost-controlled)

This is a real product. It answers questions. It retrieves documents. It queries databases in plain English. What it cannot do — yet — is take action outside itself.

---

## What the n8n sidecar adds

This session introduces **n8n as a sidecar automation engine.**

n8n is a visual workflow automation platform used in production by thousands of engineering teams. It connects 400+ business systems — Google Workspace, Jira, Slack, Teams, Salesforce, email, calendars, databases — and can run AI agents that execute structured business workflows.

In the sidecar model:

- **The chatbot owns the conversation.** Users interact with the chatbot as they always have.
- **n8n owns the action.** When the app detects an automation request, it calls an authenticated FastAPI automation endpoint. FastAPI calls n8n, n8n executes the workflow, returns a structured result, and the chatbot surfaces it to the user.

The user never knows n8n exists. They just see their request completed.

---

## The demo scenario

A user types into the chatbot:

```
Create a high priority ticket: my VPN is not working since this morning.
```

What happens next:

1. The React automation handler recognizes this as a ticket request
2. FastAPI calls n8n's webhook with the message and authenticated user context
3. n8n's specialist AI agent extracts issue, category (IT Support), priority (high), assigned team, and next action
4. n8n inserts a structured triage row into Supabase
5. n8n sends a Gmail confirmation
6. n8n returns the ticket ID and confirmation to FastAPI
7. The chatbot displays: *"Created TKT-1024 | IT Support | high | Team: IT Support | Status: Open."*

The chatbot answered. n8n acted.

---

## Architecture

```
User
 ↓
React Chatbot UI
 ↓
FastAPI Backend  ←── React automation handler / automation route
 ↓
POST /api/automations/ticket
 ↓
n8n Webhook  (cloud-hosted, public HTTPS URL)
 ↓
n8n AI Agent  (specialist: ticket extraction only)
 ↓
PostgreSQL node  (insert Supabase ticket row)
 ↓
Gmail node  (send confirmation)
 ↓
JSON response → FastAPI → Chatbot UI displays confirmation
```

---

## Why two AI layers?

The reference app already has AI capability in the product layer, and n8n has an AI agent in the sidecar. They do different things and must not be confused.

| | Product AI layer (`amzur-ai-chat`) | n8n Agent (sidecar) |
|---|---|---|
| **Decides** | Chat/RAG/SQL/spreadsheet behavior through existing routes and panels; the sidecar adds an explicit automation route | Ticket fields — category, priority, issue description, assigned team, next action |
| **Knows about** | Full conversation history, user identity, thread context | Only the structured webhook payload for this request |
| **Can do** | Chat, retrieve, query databases/spreadsheets, call the automation endpoint | Create ticket, notify, return confirmation |
| **Lives in** | Python / FastAPI codebase | n8n cloud canvas |

The contract between them is an explicit JSON envelope. No agent talks to another agent without a defined schema — that is the key architectural rule.

## Why not just add tools directly to the app?

Direct tools are valid for simple product-owned capabilities. But business actions usually become workflows: validate the request, classify it, write to a system, send notifications, handle failures, and add approvals for sensitive cases.

n8n provides that workflow layer: connectors, credentials, retries, execution history, and a visual canvas. The application keeps ownership of user identity and conversation. n8n owns external business-process execution.

---

## What students demonstrate at the end

1. Natural language database question → SQL answer + dangerous query rejected
2. Natural language spreadsheet question → correct answer
3. User types ticket request in chatbot → FastAPI calls n8n webhook → ticket row appears in Supabase → Gmail confirmation arrives → chatbot displays confirmation with ticket ID

---

## Final messaging for management

> "The first nine projects build a production-style AI chatbot: authentication, persistent memory, PDF document retrieval, natural language database queries, and spreadsheet analysis — all in one full-stack product. The tenth project connects that chatbot to real-world business workflows through n8n. The result is a chatbot that does not just answer questions — it completes tasks. This reflects the architecture pattern used by engineering teams shipping AI products today: the application owns the user experience, identity, and data; n8n owns the integrations, business-process actions, and external notifications."

---
