# Optional Framing — The Sidecar Mental Model

**Time:** 5–10 minutes
**Format:** Trainer-led. Slides + canvas screenshot. No student hands-on yet.
**Goal:** Every student understands why n8n exists in this stack, what it does, and what it does not do.

---

## Trainer opening (verbatim, ~2 min)

> "Before we touch n8n, I want to spend a few minutes on the mental model — because if you walk in thinking n8n is a replacement for the chatbot product, you'll be confused. It is not a replacement. It is an addition.
>
> The chatbot is already a real product with users, login, threads, memory, PDF retrieval, SQL queries, and spreadsheet analysis. Everything in that stack is exactly where it belongs — in Python and FastAPI, because we needed fine-grained control, user identity, and custom UI.
>
> Today does one thing: it gives that product an automation engine. Not a smarter brain. An automation engine. When the chatbot recognizes that a user wants to take a business action — create a ticket, send a notification, update a record in an external system — it hands that action to n8n. n8n does it. The chatbot reports back.
>
> That is the sidecar pattern. And that is what we are building today."

---

## The mental model (draw this on the board or show on screen)

```
                                                       
  USER: "Create a high priority ticket:               
         my VPN is not working."                      
                ↓                                     
        React Chatbot UI                              
                ↓                                     
        FastAPI Backend                               
                ↓                                     
   React/FastAPI automation handler:                  
   "This is an automation request."                   
                ↓                                     
   POST /api/automations/ticket  ─────────────────┐   
                                                  ↓   
                                         n8n Webhook  
                                                  ↓   
                                        n8n AI Agent  
                                    (specialist only)  
                                                  ↓   
                                  Supabase ticket row 
                                  inserted: TKT-1024  
                                                  ↓   
                                  Gmail confirmation  
                                                  ↓   
   ← ─ ─ ─ ─ ─ ─ ─ ─ JSON response ─ ─ ─ ─ ─ ─ ─   
                ↓                                     
   Chatbot: "Created TKT-1024. Team: IT Support. Status: Open."         
```

---

## Layer responsibilities (say this slowly — it answers the "why two agents?" question before anyone asks)

| Layer | What it owns | What it does NOT own |
|---|---|---|
| **React** | Chat UI, file panels, thread list, user experience | Business logic, data, AI reasoning |
| **FastAPI** | Auth, sessions, routing, API boundaries | UI rendering, workflow execution |
| **PostgreSQL** | Users, threads, messages, attachments, query logs | External system state |
| **LangChain / LCEL** | Chat chain, memory, RAG, SQL agent, spreadsheet agent | External integrations, notifications |
| **LiteLLM** | LLM routing and model gateway | Application logic |
| **n8n** | Workflow automation, external system actions, notifications, approvals | User identity, conversation history, product UI |

The key line: **n8n handles actions in external systems. The application handles everything to do with users and conversation.**

---

## The two-agent rule (3 min)

Some students will notice the product already has AI logic and n8n also has an AI agent. That is intentional. They are not duplicates.

**Product AI layer (`amzur-ai-chat`):**
- Sees the full conversation history and user identity
- Uses explicit routes for chat streaming, RAG, SQL, and spreadsheet query
- The sidecar adds `POST /api/automations/ticket` for ticket automation

**n8n agent (specialist agent):**
- Sees only the structured webhook payload it was given
- Does one job: extract ticket fields (issue, category, priority, assigned team, next action) and call the ticket-creation tool
- Returns a structured JSON confirmation
- Knows nothing about the user's conversation history

**The rule:** Product layer owns identity, thread context, and API boundaries. n8n agent executes action. The contract between them is explicit JSON. No agent should talk to another agent without a defined schema.

> "The most common mistake students make is building a general chatbot inside n8n and then wondering why they have two chatbots. That is not the pattern. n8n's agent in this project should refuse to do general chat. It has one job."

---

## What n8n is (1 min, facts only)

- **Fair-code open source.** Self-host free or use n8n Cloud (what we use today).
- **400+ built-in integrations:** Gmail, Sheets, Slack, Jira, Salesforce, Stripe, Postgres, and a generic HTTP Request node for anything else.
- **AI cluster built in:** AI Agent, Chat Model sub-nodes, Memory, Vector Stores, Embeddings, Guardrails, Model Selector — wraps LangChain.js.
- **Production-grade:** Used by thousands of engineering teams. Can run in queue mode with Redis workers, version-controlled via Git, monitored with Langfuse.

---

## What n8n is not (1 min)

- **Not a replacement for the chatbot product.** The chatbot owns users, login, chat history, RAG, and the custom UI. n8n cannot own those.
- **Not a place for consumer-facing chat.** n8n's Chat Trigger is for internal tools and prototyping. For customer-facing chat, you use the React UI we built.
- **Not a ML training platform.** It consumes models, does not train them.
- **Not Kubernetes or infra orchestration.** n8n orchestrates business workflows, not containers.

---

## The five n8n patterns (1 min — for broader context)

Today we build **Pattern 3**. The others exist and are worth knowing.

| Pattern | One-line description | Example |
|---|---|---|
| **Automation** | When X happens in system A, do Y in system B | New Jira ticket → Slack notification |
| **Data pipeline** | Schedule → fetch → transform → write | Nightly Shopify orders → Postgres |
| **AI agent** ★ | Trigger → AI reasoning loop → tool calls → result | **What we build today** |
| **Integration glue** | Event from one SaaS → action in another | Stripe payment → HubSpot deal created |
| **Human-in-the-loop AI** | Agent proposes → human approves → execute | Draft email → manager approves → sent |

---

## Close framing, transition (30 sec)

> "For the next two and a half hours we are going to verify that your app is ready and get your n8n Cloud instances set up. After lunch we build the sidecar. Questions on the framing before we move into checkpoints?"

Take 2–3 questions max. For anything deeper, refer to `PITCH.md` (the management brief) which covers the architecture and two-agent rule in detail.

---

## Trainer notes

- **The one answer that covers 80% of framing questions:** "The application owns the user. n8n owns the action."
- If a student asks "can't n8n do everything the chatbot does?" — the honest answer is yes for internal tooling, but no for a product with users, persistent threads, custom auth, and a custom UI. The chatbot product they built is not replaceable by n8n for a production product.
