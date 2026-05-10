# Trainer Pitch — n8n as the Sidecar

> **Format:** Optional 5–10 minute spoken introduction for the compact n8n sidecar session.
> **Audience:** ~100 Amzur engineers who have completed the reference chatbot. They know Python, FastAPI, LangChain, PostgreSQL, JWT auth, Google OAuth, RAG, database querying, and spreadsheet querying. They have never used n8n.
> **Goal:** By the end of this pitch they can explain (a) what n8n is, (b) why it is being introduced as a sidecar and not as a replacement for the chatbot, (c) what they will build in the session.
> **Delivery note:** Section headers become slides. Bold beats are mandatory even if you skip surrounding text. Section 3 has a spoken summary (3 min) + full reference — use the reference for Q&A, not for live presentation.

---

## Section 0 — Open (30 seconds)

> "Today we wire the AI chatbot product to the real world.
>
> We are not replacing anything we built. We are not rebuilding the chatbot in n8n. We are adding one component — an automation sidecar — that lets the chatbot take actions in external business systems.
>
> In this session, you will demo a chatbot that creates a support ticket from a natural language request. The ticket will appear in Supabase, a Gmail confirmation will be sent, and the chatbot will display the ticket ID."

---

## Section 1 — What is n8n? (3 min)

### The one-line definition

> **"n8n is a visual way to express: trigger → series of steps → output. Each step is a node. Each arrow passes data. What makes it powerful is that one of those steps can be an AI Agent — so you can mix deterministic steps (API calls, data transformations, database writes) with nondeterministic steps (LLM reasoning) in the same graph."**

That sentence is the mental model. It is also the correct answer to "what is n8n?" in any interview.

### The facts (state these, do not dwell)

- **Fair-code / open source.** Source on GitHub. Self-host free with one Docker command, or use n8n Cloud. We use n8n Cloud today — no setup required on your machines.
- **400+ built-in integrations:** Gmail, Sheets, Slack, Jira, Salesforce, HubSpot, Stripe, Notion, PostgreSQL, Airtable — plus a generic HTTP Request node for anything without a native integration.
- **Full AI cluster built in:** AI Agent, Chat Model sub-nodes, Memory, Vector Stores, Embeddings, Guardrails, Model Selector, Chat streaming — wraps LangChain.js under the hood. These are not beta features — they are in production deployments today.
- **Node-based canvas:** drag node, connect output to input, configure in a form, run.

### What it is not

- Not a chatbot UI — n8n's Chat Trigger is for internal tooling and prototyping, not consumer-facing chat
- Not an ML training platform — it consumes models, does not train them
- Not a replacement for FastAPI or LangChain when you need a product with users, auth, and a custom UI
- Not Kubernetes — n8n orchestrates business workflows, not containers

---

## Section 2 — How does it fit with what you already know? (3 min)

> "You have built AI systems in Python using LangChain. n8n wraps LangChain.js. The concepts are identical. Same names: chains, agents, tools, memory, vector stores, embeddings. The difference is that in n8n you express those concepts visually on a canvas instead of writing code."

### The competitive landscape (know this for Q&A)

| Tool | What it is | When you'd pick it over n8n |
|---|---|---|
| **LangChain / LlamaIndex** | Python/JS libraries for AI apps in code | When building a product with fine-grained control and your team writes Python regularly |
| **LangGraph** | LangChain's framework for stateful agent graphs | When your agent needs explicit state machines with loops and checkpoints |
| **Zapier / Make** | No-code automation. Both added AI agents in 2025 — bolt-ons on top of task-billing engines | When the use case is simple app-to-app integration for non-technical users |
| **Dify / Langflow** | Open-source visual AI builders (both crossed 100k GitHub stars in 2025) | Langflow is closer to a canvas LangChain; Dify is more opinionated. Neither has n8n's integration depth. |
| **Temporal / Airflow** | Workflow engines for code-defined pipelines | When you need durable execution, retries, and distributed task orchestration at scale |

### n8n's position in 2026

> **"The AI agent tool space commoditised fast in 2025. RAG, memory, tool use, web search — every platform has them now. What still differentiates n8n is: 400+ native integrations, a canvas that non-engineers can read, and AI as a first-class architectural citizen — not a bolt-on. The business case for n8n is not 'it can do AI.' It is 'it can do AI and connect to everything your company already uses, and anyone on the team can read and modify the workflow.'"**

---

## Section 3 — How does the sidecar pattern work? (3 min spoken + reference below)

### 3.1 — The spoken version (3 min)

> "In the product you built, FastAPI and LangChain own the AI product layer. Chat streams through the chat route, RAG uses the document route, and SQL/spreadsheet questions use dedicated query panels. What the product cannot do yet is take actions in external business systems. Create a Jira ticket. Update a Salesforce record. Send a Slack notification to a specific channel. Write a workflow-owned record.
>
> The sidecar pattern says: when the app detects an automation request, it calls a FastAPI automation endpoint. FastAPI sends the structured request to n8n via a webhook. n8n executes the workflow. n8n returns a structured result. The chatbot surfaces that result to the user.
>
> The user types: 'Create a high priority ticket, my VPN is broken.'
> The React P10 handler recognizes the ticket request and calls FastAPI's ticket endpoint.
> FastAPI uses the existing httpOnly-cookie auth to identify the user, then calls the n8n webhook with the message and the user's email.
> n8n's specialist agent extracts: category = IT, priority = high, issue = VPN broken, assigned team = IT Support, next action = check VPN access.
> n8n writes a ticket row to Supabase, sends a Gmail confirmation, and returns the ticket ID.
> The chatbot says: 'Created TKT-1024 | IT Support | high | Team: IT Support | Status: Open.'
>
> Two key rules:
> 1. **The product layer owns user identity and routing.** The n8n agent executes action. They are layered — not duplicated.
> 2. **The contract is explicit JSON.** FastAPI sends a defined structure. n8n returns a defined structure. No agent talks to another agent without a schema."

### 3.2 — Production path reference (for Q&A — do not present live)

| What you build today (demo-grade) | Production swap |
|---|---|
| n8n Cloud free trial | n8n Cloud Pro, self-hosted Business, or Enterprise/self-hosted on VPS with `--restart unless-stopped` |
| Supabase `tickets` table | Jira, ServiceNow, Linear, or another production ticket store |
| Basic webhook authentication | Rotate the Header Auth secret, restrict callers where possible, and store the secret outside source code |
| No error handling | Error Trigger workflow → Slack/email alert on any failure |
| gpt-4o-mini for all tickets | Model Selector node: route high/critical to gpt-4o, low/medium to gpt-4o-mini |
| No input validation | Guardrails node: check for prompt injection before the AI Agent |
| Workflow JSON in UI only | Export JSON → Git → deploy via n8n REST API in CI/CD |
| No observability | Langfuse credential connected to AI Agent → full LLM trace per execution |

#### Production infrastructure (self-hosted)

```bash
docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_ENCRYPTION_KEY=your-random-32-char-key \
  -e WEBHOOK_URL=https://your-public-domain.com \
  docker.n8n.io/n8nio/n8n
```

Key flags:
- `--restart unless-stopped`: auto-restarts after server reboot
- `N8N_ENCRYPTION_KEY`: encrypts all credentials at rest. Set once before creating any credentials, never change after.
- `WEBHOOK_URL`: tells n8n its public URL so webhook nodes generate correct external URLs

For scale: add Redis queue mode + n8n-worker containers. Migrate Simple Memory to Postgres Chat Memory before enabling queue mode — this is the most common production failure when scaling for the first time.

---

## Section 4 — New n8n features worth knowing about (2 min)

> "n8n has shipped a lot since 2024. These are the ones most relevant to what you are building today and in the near future."

| Feature | Available since | What it unlocks |
|---|---|---|
| **HTTP Request Tool** (full config) | v1.90 (Apr 2025) | Full HTTP Request node capability inside an AI agent tool — pagination, batching, cURL import |
| **Model Selector node** | v1.100 (Jun 2025) | Route between multiple LLMs based on conditions — cost, task type, availability |
| **Chat streaming** | v1.103 (Jul 2025) | Streamed word-by-word responses in the n8n chat interface and via webhook |
| **Human-in-the-loop Chat node** | v1.105 / v2.5 (Jul 2025 / Jan 2026) | Pause workflow execution, send a message to the user, wait for approval before continuing |
| **Guardrails node** | v1.119 (Nov 2025) | Filter inputs/outputs: block prompt injection, sanitize PII, apply content policies |

---

## Section 5 — The Session Ahead (1 min)

| Segment | Time | What happens |
|---|---|---|
| **Frame** | 5–10 min | The sidecar mental model, architecture, two-agent rule |
| **Verify** | 10–15 min | n8n Cloud, LiteLLM, Supabase, and Gmail readiness |
| **Build** | 60–75 min | Build and wire the sidecar end-to-end |
| **Validate** | 15–20 min | Ticket creation test and normal-chat regression check |

**Before building:**
> "If you did not complete PREREQS.md before this session, open your n8n Cloud account right now. Get the LiteLLM and Supabase credentials ready. If Gmail is blocked, continue with Supabase first."

---

## Trainer Q&A prep

These are the questions expected from engineers who have built the reference chatbot.

### Q1 — "Why not build everything in n8n instead of the chatbot app?"

> "n8n is excellent for business workflow automation. It is not the right tool for a product with custom user identity, persistent chat threads, role-based permissions, a custom React UI, and fine-grained LLM control. You cannot own your users in n8n the way you can in FastAPI + PostgreSQL. You cannot build the auth system, thread management, retrieval lifecycle, or database-query guardrails in n8n with the same depth and control. The chatbot app is the product. n8n is the automation sidecar. They are not alternatives — they are complements."

### Q2 — "Why does n8n also have an AI agent? Are we duplicating?"

> "No. In the current reference app, the product AI layer is split across explicit FastAPI routes: chat streaming, RAG, SQL, and spreadsheet query. P10 adds one more explicit route for automation. The n8n agent is a specialist. It knows nothing about your conversation history. It has one job: extract ticket fields and call the ticket tool. Product layer owns the user/session; n8n owns the action."

### Q3 — "Can n8n replace the FastAPI backend for the integration?"

> "For simple internal tools, yes. For this product, no. FastAPI owns authentication. It knows who the user is, what thread they are in, what their permissions are. n8n sees only the structured payload FastAPI sends it. The webhook contract keeps the product's security boundary clean — n8n never needs to know about JWT tokens, user sessions, or the chatbot's internal state."

### Q4 — "What about data privacy? Our ticket data goes to LiteLLM and n8n Cloud."

> "In today's session: yes. For production with sensitive data: self-host n8n (one Docker command) and point it at a self-hosted LLM via Ollama or a private LiteLLM deployment. The architecture is identical — only the endpoints change. Your data never leaves your infrastructure. This is one of the reasons n8n exists as a self-hostable tool."

### Q5 — "How do I version and deploy n8n workflows?"

> "Workflows export as JSON. Commit them to Git. n8n has a Save/Publish distinction — Save is a draft, Publish pushes live and retains the previous version for rollback. For CI/CD: two API calls — POST the JSON to `/api/v1/workflows`, then activate it. Enterprise plan adds Git-based environments with branch-per-environment support and project admins who can commit directly."

### Q6 — "Is n8n production-ready?"

> "Yes. It runs in production at thousands of companies, raised a Series C at a $1B valuation in 2025, and has 180,000+ GitHub stars. The production path is: activate the workflow, move to a server with Docker `--restart unless-stopped`, set `N8N_ENCRYPTION_KEY`, wire an Error Trigger workflow for alerts, connect Langfuse for LLM observability, and add Redis queue mode when load demands it. Same architecture as any microservice — you drag boxes instead of writing glue code."

### Q7 — "What does n8n cost in production?"

> "Self-hosted: free Community Edition. n8n Cloud: Starter at €20/month annually with 2,500 executions and unlimited users and workflows; Pro starts at €50/month annually with higher execution tiers. For higher-volume needs: self-hosted Business starts around €667/month annually, or custom Enterprise pricing. The LLM costs are separate — that is your LiteLLM proxy or OpenAI account, not n8n."

### Q8 — "We already have an LLM API call or agent. Why not integrate tools directly?"

> "You can integrate tools directly into the app. For one or two product-owned tools, that is fine. But business actions are rarely one API call. A ticket workflow may need validation, classification, a database or Jira write, Slack notification, email confirmation, retry handling, error alerts, and later a swap to ServiceNow. If we put all of that in LangChain tools or FastAPI services, we are now maintaining workflow glue code. n8n gives us connectors, credentials, retries, execution history, and a visual workflow the team can inspect. Product capabilities stay in the app; cross-system business workflows move to n8n."

> "A simple rule: querying our own product database belongs in FastAPI/LangChain because it is product data and needs product guardrails. Creating a support ticket, sending notifications, routing approvals, or updating external systems belongs in n8n because that is business workflow automation."

### Q9 — "Can LangChain or LangGraph handle agent workflows with many tools?"

> "Yes. LangChain and LangGraph can handle agent workflows with many tools. n8n is not being introduced because LangChain cannot do it. It is introduced because business workflow automation has concerns beyond reasoning: SaaS credentials, connectors, retries, execution logs, operational visibility, approvals, notifications, and workflows that non-backend teams can inspect. If you want all integrations in Python and your team is ready to own all API clients and workflow operations in code, LangGraph is a valid architecture. Our pattern today is: product intelligence stays in the app; cross-system business actions move to n8n."

---

## Trainer logistics

- **This pitch is optional.** Keep it to 5–10 minutes so the session can finish within 90–120 minutes.
- **n8n Cloud accounts:** Students should have done PREREQS.md before this session. If many have not, use the PREREQS troubleshooting section and keep the live scope to Supabase ticket creation first.
- **Share the production checklist** (Section 3.2 above) after the session. It motivates the "what comes next" question and gives them a clear path from the demo to a real deployment.
- **n8n.io/customers** — check this page the morning of class. Cite two or three company names from the customer list when giving production credibility. The list updates; citing a stale entry is an easy credibility hit.
- Students submit screenshots and their n8n workflow JSON export to the shared Google Sheet after the demo.
