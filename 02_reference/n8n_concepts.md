# n8n Concepts — a thorough reference

> Every workflow in n8n follows the same shape:
> **trigger → series of nodes → output**
>
> This doc catalogs every part of that shape: all the trigger types, all the flow-control / routing nodes, all the AI cluster nodes, and every kind of tool an AI Agent can connect to. Cross-referenced back to the docs.

---

## The big picture

A workflow in n8n is a directed graph:

```
[Trigger] → [Node] → [Node] → ...  → (output / side effect)
                  ↘
                   [Node] → ...
```

- **Trigger nodes** start the workflow. Exactly **one** fires per execution (though a workflow can have multiple triggers installed — whichever matches the event runs).
- **Core nodes** do the plumbing: routing, transforming, looping, waiting.
- **Integration nodes** do the real work: calling Gmail, posting to Slack, reading Sheets, etc.
- **AI cluster nodes** are the "smart" parts: agents, chains, memory, vector stores. They're built on LangChain.js under the hood.
- **Output** is whatever the last node does — reply in chat, send an email, write a row, or nothing at all (the data just sits in the execution log).

Data flows between nodes as **arrays of items**. Every node receives an array, processes it (usually once per item), emits an array. This matters for loops and aggregation — more on that below.

---

## Part 1 — Triggers (all 8 categories you see when clicking `+`)

[Official docs: Triggers library](https://docs.n8n.io/integrations/builtin/trigger-nodes/)

A workflow needs at least one trigger. When you click `+` on an empty canvas, n8n shows these categories:

### 1. Manual Trigger

[Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.manualworkflowtrigger/)

- **Starts**: when you click **Execute workflow** in the editor
- **Use for**: testing, iterating, one-off runs
- **Can only have one per workflow**
- **Convention**: build-and-test with Manual Trigger, then swap to the real trigger before publishing

### 2. Chat Trigger

[Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/)

- **Starts**: when a user sends a message in the chat interface
- **Modes**: Hosted Chat (n8n's built-in UI) or Embedded Chat (your own UI via the `@n8n/chat` npm widget)
- **Auth**: None / Basic Auth / n8n User Auth
- **Use for**: AI chatbots, interactive agents, anything where a user types back and forth
- **Must connect to**: an AI Agent or Chain root node
- **Session semantics**: each new chat page = new session ID → fresh memory (if using Simple Memory default)

### 3. Webhook

[Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)

- **Starts**: when an HTTP request hits the node's URL
- **Supports**: GET/POST/etc., path parameters, custom auth, returning responses (paired with **Respond to Webhook** node)
- **Two URLs**: test URL (listens when you click "Listen for test event") + production URL (active when workflow is published)
- **Use for**: receiving data from external services that don't have a dedicated trigger, building REST-like endpoints, Slack/Discord/custom slash commands, IoT integrations
- **The universal fallback** for any system that can make HTTP calls

### 4. Schedule Trigger

[Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/)

- **Starts**: on a time schedule (every N minutes / hourly / daily at X / cron expression)
- **Use for**: daily digests, hourly polling, batch ETL jobs, maintenance workflows
- **Replaces** the deprecated Cron node
- Example: fire at `0 8 * * 1-5` → weekdays at 8 AM

### 5. On App Event (the huge category — ~400 nodes)

[Docs](https://docs.n8n.io/integrations/builtin/trigger-nodes/)

These are the **400+ service-specific triggers**. Technically, n8n classifies them into two sub-types:

| Sub-type | How it works | Example triggers |
|---|---|---|
| **Webhook-based** | Service pushes events to n8n in real time (service supports webhooks). Low latency. | Telegram Trigger, Zendesk Trigger, Stripe Trigger, GitHub Trigger |
| **Polling** | n8n periodically calls the service's API to check for new data (service has no webhooks). Default poll interval: 1-5 min. | Gmail Trigger, Google Sheets Trigger, Airtable Trigger, RSS Feed Trigger |

- **Use for**: "when X happens in app Y, do Z"
- **Example**: Gmail Trigger → classify email → draft reply (this is Session 1 of the training)

### 6. Email Trigger (IMAP)

[Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailimap/)

- **Starts**: when a new email arrives in an IMAP mailbox
- **Works with**: any IMAP-supporting email provider (Gmail with app password, corporate Exchange, self-hosted mail, etc.)
- **Different from Gmail Trigger**: uses raw IMAP (not Gmail API) — universal but heavier
- **Use for**: processing emails from non-Gmail mailboxes, or when you want more control than the Gmail API offers
- **Rule of thumb**: prefer Gmail Trigger for Gmail, IMAP Trigger for everything else

### 7. SSE Trigger

[Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.ssetrigger/)

- **Starts**: when a Server-Sent Events stream emits a message
- **How it differs from Webhook**: SSE is a long-lived HTTP connection where the server pushes events to the client over time (one-way stream). Webhook is a one-shot request.
- **Use for**: consuming real-time event streams from services like Replicate's streaming API, OpenAI's streaming completions, or any service that exposes SSE
- **Rare in practice** — most devs use Webhook or the API directly

### Other triggers you might meet

| Trigger | What it does | Docs |
|---|---|---|
| **Execute Sub-workflow Trigger** | Starts when another n8n workflow calls this one via Execute Sub-workflow node or Call n8n Workflow Tool | [Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflowtrigger/) |
| **Form Trigger** | Serves an HTML form; triggers on submission | Part of n8n-nodes-base |
| **n8n Trigger** | Fires on n8n lifecycle events (workflow updated, published, instance start) | [Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.n8ntrigger/) |
| **Error Trigger** | Fires when another workflow fails — for building error-handling pipelines | Part of n8n-nodes-base |

### Multiple triggers in one workflow

You can attach several triggers to the same workflow. On each execution, **only one fires** (whichever matched the event). Useful for: "this workflow can be triggered by a chat OR a schedule OR a webhook — all feed the same downstream logic."

---

## Part 2 — Flow control and core nodes (the "plumbing")

[Official docs: Flow logic](https://docs.n8n.io/flow-logic/)

These are the nodes that move data around without doing AI or external-service work.

### Splitting — conditional branching

| Node | When to use | Outputs |
|---|---|---|
| **IF** | Two-way branch based on a condition. True branch vs false branch. Simple boolean tests. | 2 (true / false) |
| **Switch** | Multi-way branch based on multiple conditions or an expression returning an index. Think of it like `switch/case` in code. | N (configurable) |
| **Filter** | Drop items that don't match a condition, pass matching items through. Like a "keep only" gate. | 1 (filtered) |

[IF docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.if/) · [Switch docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.switch/)

**Rule of thumb:**
- Use **IF** when you have 2 paths (true / false)
- Use **Switch** when you have 3+ paths ("urgent / normal / spam / newsletter")
- Use **Filter** when you just want to drop some items, not branch

### Merging — combining streams

| Node | What it does |
|---|---|
| **Merge** | Combine data from 2+ upstream nodes. 3 modes: **Append** (stack them), **Combine** (inner/outer/left/right join on matching field), **SQL** (run SQL-like query over the streams). |
| **Compare Datasets** | Compare 2 streams, emits 4 separate outputs: only in A / only in B / matches / differs. Great for diff-and-sync workflows. |
| **Code** | Manual merge via JS/Python when the built-in modes don't fit |

[Merge docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge/) · [Flow logic: merging](https://docs.n8n.io/flow-logic/merging/)

### Looping

n8n **loops automatically** over items — most nodes run once per incoming item. You usually don't need an explicit loop.

You **do** need one when:
- You want to batch items to avoid rate limits
- A node only processes one item at a time (e.g., some AI nodes)
- You need to loop until a condition is met (polling pattern)

| Node | When to use |
|---|---|
| **Loop Over Items** (aka Split In Batches) | Process items in batches of N. Has two outputs: `loop` (current batch) and `done` (after all batches). Used for rate-limit-safe iteration. |
| **IF node** (in a cycle) | Loop until a condition. Connect a node's output back to a previous node's input, with an IF node checking when to exit. Dangerous if the exit condition never matches → infinite loop. |

[Loop Over Items docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/) · [Flow logic: looping](https://docs.n8n.io/flow-logic/looping/)

### Aggregating & reshaping

| Node | What it does |
|---|---|
| **Aggregate** | Collapses N items → 1 item with array fields. Critical when passing "all calendar events" into a single LLM prompt (this was Session 2's teaching point). |
| **Split Out** | The opposite — takes a field containing an array and expands it into N items. |
| **Edit Fields** (aka Set) | Add / modify / remove fields on items. Supports **JSON mode** (dump a whole object) or **Manual Mapping** (field-by-field). |
| **Remove Duplicates** | Deduplicate items by a specified field |
| **Sort** | Sort items by a field |
| **Summarize** | Aggregate numeric fields (sum / avg / min / max / count), grouped by a field |

### Waiting

| Node | When to use |
|---|---|
| **Wait** | Pause the workflow for N seconds, until a specific time, or until a webhook is received. Used for rate-limiting, scheduling delays, or human-in-the-loop flows. |

[Wait docs](https://docs.n8n.io/flow-logic/waiting/)

### Error handling

| Node | When to use |
|---|---|
| **Stop And Error** | Explicitly fail the workflow with a custom error message |
| **Error Trigger** | A special trigger for *another* workflow — fires when any other workflow in your instance fails. Typically used to build "when any workflow errors, post to Slack + page on-call." |
| **Set node's "Continue On Fail" option** (per-node setting) | Any node can be configured to keep going on error instead of stopping the workflow |

[Flow logic: error handling](https://docs.n8n.io/flow-logic/error-handling/)

### Calling other workflows

| Node | When to use |
|---|---|
| **Execute Sub-workflow** | Call another workflow as a step. Parent waits for child to finish, gets child's output. |
| **Execute Sub-workflow Trigger** | First node of the child workflow — receives input from the parent |
| **Call n8n Workflow Tool** | The **AI-agent version** of the above — exposes a sub-workflow as a tool the agent can pick dynamically |

### Code and HTTP (the "escape hatches")

| Node | When to use |
|---|---|
| **Code** | Drop to JavaScript or Python when visual nodes can't express what you need. Two modes: "Run Once for All Items" (sees the full array) or "Run Once per Item" (per-item processing). |
| **HTTP Request** | Call any REST API. When n8n doesn't have a dedicated integration, this is the fallback. Supports all HTTP methods, auth types (Basic, Bearer, OAuth1/2, custom), body formats, pagination. |
| **Webhook Response / Respond to Webhook** | Paired with a Webhook trigger — explicitly return a response body/status to the caller |

### NoOp (the "do nothing" node)

A node that passes items through unchanged. Used for:
- Making workflow diagrams clearer (label a junction point)
- Placeholders during development

---

## Part 3 — AI cluster nodes

[Official docs: LangChain concepts in n8n](https://docs.n8n.io/advanced-ai/langchain/langchain-n8n/)

Everything AI-related in n8n is built on **LangChain.js** but exposed as visual nodes. The architecture uses a **root node + sub-nodes** pattern called a "cluster".

```
┌────────────────────┐
│  Root Node         │  (AI Agent, Chain, or Vector Store)
│                    │
│  sub-node ports:   │
│  ├─ Chat Model     │ ← attach sub-node
│  ├─ Memory         │ ← attach sub-node
│  ├─ Tool           │ ← attach sub-node(s)
│  ├─ Embedding      │ ← attach sub-node
│  └─ Document       │ ← attach sub-node
└────────────────────┘
```

### Root nodes — the "main" AI nodes

#### Chains (stateless pipelines)

[Docs: chains in n8n](https://docs.n8n.io/advanced-ai/examples/understand-chains/)

Chains are **stateless**. Same input → same output. They cannot hold memory. Used when the task is pure transformation (classify, summarize, extract).

| Chain | Purpose |
|---|---|
| **Basic LLM Chain** | Send a prompt + inputs to an LLM, get the response back. The simplest building block. |
| **Retrieval Q&A Chain** | Connects to a vector store via a retriever. Use for "answer question using these documents" without an agent's flexibility. |
| **Summarization Chain** | Takes text, returns a summary. Uses chunking strategies internally for long docs. |
| **Sentiment Analysis** | Classifies text sentiment — positive/negative/neutral (or custom labels) |
| **Text Classifier** | General-purpose classifier. You define categories + descriptions; it picks one. **Used in Session 1.** |

#### Agents (stateful, tool-using)

[Docs: agents in n8n](https://docs.n8n.io/advanced-ai/examples/understand-agents/)

| Root node | Purpose |
|---|---|
| **AI Agent** | The main agent node. Since n8n v1.82+, it's always a "Tools Agent" (ReAct pattern). Holds memory, picks tools dynamically, loops until it has an answer. |
| **AI Agent Tool** | A sub-agent — attaches to a parent AI Agent's Tool port. Used for multi-agent orchestration on a single canvas. **Session 5's headline node.** |

**Chain vs Agent — the one-line rule:**
- If the task is a pure transformation (classify, summarize) → use a **Chain** (cheaper, deterministic)
- If the task requires deciding which tool to call or holding conversation state → use an **Agent**

#### Vector Stores (as root nodes)

Each vector store has both a root-node form (for ingestion/query outside an agent) and a sub-node form (as a tool for an agent).

| Vector Store | Persistence | Setup complexity |
|---|---|---|
| **Simple Vector Store** | **In-memory**, lost on restart. Not persistent. Dev-only. | None |
| **pgvector (Postgres)** | Durable, SQL-queryable | Requires Postgres with the pgvector extension |
| **Pinecone** | SaaS (external) | Pinecone account + API key |
| **Qdrant** | Self-hostable or cloud | Qdrant instance + API key |
| **Supabase** | SaaS (Postgres + pgvector under the hood) | Supabase account |
| **Zep** | Self-hostable or cloud, specialized for chat histories | Zep instance |

### Sub-nodes — the building blocks that attach to root nodes

#### Chat Model sub-nodes (the "brain")

These plug into an AI Agent's Chat Model port or a Chain's equivalent.

- **OpenAI Chat Model** — GPT-4o, GPT-4o-mini, GPT-3.5, etc.
- **Anthropic Chat Model** — Claude 3/4 family
- **Google Gemini Chat Model** — Gemini models
- **AWS Bedrock Chat Model** — any model in Bedrock
- **Cohere Model** — Cohere's LLMs
- **Mistral Cloud Chat Model** — Mistral's hosted models
- **Hugging Face Inference Model** — HF's hosted models
- **Ollama Chat Model** — **local models**, fully self-hosted (Llama, Mistral, Qwen, etc.)
- **LangChain Code** — drop any LangChain.js chat model via code

The AI Agent is **model-agnostic** — swap the Chat Model sub-node and the rest of the wiring stays the same.

#### Memory sub-nodes

[Docs](https://docs.n8n.io/advanced-ai/examples/understand-memory/)

Memory is how an agent remembers previous turns in a conversation. Attach to AI Agent's Memory port.

| Memory | Backing store | When to use |
|---|---|---|
| **Simple Memory** (formerly Window Buffer Memory) | In-process RAM | Dev, single-user demos, classroom. Lost on restart. Does not work in queue mode. |
| **Postgres Chat Memory** | Postgres | Production default. Persistent, multi-worker-safe. |
| **Redis Chat Memory** | Redis | Production when you want low-latency, ephemeral-ish memory with TTL support |
| **MongoDB Chat Memory** | MongoDB | Production if your stack is already Mongo |
| **Xata** | Xata (SaaS) | Managed option |
| **Zep** | Zep | Specialized — adds summarization and relevance ranking on top |
| **Motorhead** | Motorhead (self-hosted) | Open-source alternative to Zep |

**Context Window Length** (on all memory types): how many prior turns the memory passes back into the LLM prompt. 5-10 is typical for classroom; 20-40 for production.

**Chat Memory Manager**: a utility node to read/write memory contents without it being attached to an agent. Useful for sharing memory across multiple agents.

#### Embeddings sub-nodes

These turn text into vectors. Attach to Vector Store's Embedding port.

- **Embeddings OpenAI** — `text-embedding-3-small` (fast/cheap) or `text-embedding-3-large` (better quality)
- **Embeddings Cohere**
- **Embeddings Google PaLM / Gemini**
- **Embeddings AWS Bedrock**
- **Embeddings Hugging Face**
- **Embeddings Mistral Cloud**
- **Embeddings Ollama** — local embeddings (no external API)

**The critical rule**: use the **same embedding model** on ingestion and query. Mismatched models = garbage retrieval. (Session 4's #1 teaching point.)

#### Document Loaders

Attach to Vector Store's Document port. Load source data into chunks.

- **Default Data Loader** — handles binary files (PDF, DOCX, CSV, JSON, plain text). Auto-detects format.
- **GitHub Document Loader** — loads files from a GitHub repo

#### Text Splitters (sub-sub-nodes)

Attach to Data Loader's Text Splitter port. Break documents into chunks.

- **Character Text Splitter** — split on a specific character (naive)
- **Recursive Character Text Splitter** — recursively split on paragraph → sentence → word boundaries, preserving semantic units. **Recommended default.**
- **Token Splitter** — split by LLM token count (exact for token budgets)

**Chunk Size + Chunk Overlap** are the main params. Common values: chunk 1000 chars, overlap 200 chars.

#### Output Parsers

Force an LLM's output into a specific schema. Attach to a Chain or Agent's output parser port.

- **Structured Output Parser** — JSON schema. The LLM output is validated against it; retries on mismatch.
- **Auto-fixing Output Parser** — wraps another parser; on validation failure, sends the error back to the LLM with a "fix this" prompt. Two-tries pattern.
- **Item List Output Parser** — forces output into a flat list

Output parsers change the LLM's prompt behind the scenes to include "your response must match this JSON schema".

---

## Part 4 — AI tools (what an agent can do)

An AI Agent's **Tool port** accepts many sub-node types. This is the "agent's toolbox". There are **three categories**:

### Category A — Utility tools (generic, no external service)

[Docs: tools](https://docs.n8n.io/advanced-ai/examples/understand-tools/)

| Tool | What it does |
|---|---|
| **Wikipedia** | Search + retrieve Wikipedia articles |
| **Calculator** | Deterministic math — avoids the classic "LLM is bad at arithmetic" problem |
| **SerpAPI** | Google Search results (requires SerpAPI key) |
| **Wolfram\|Alpha** | Computational knowledge queries (requires Wolfram API key) |
| **Think Tool** | A "scratch pad" tool — gives the agent a place to write out reasoning without affecting the final output. Improves reasoning on complex tasks. |
| **Vector Store Tool** | Retrieve from a vector store. **Session 4 uses this.** Two modes: retrieve-as-tool (agent picks when to call) or retrieve-as-chain (deterministic retrieval). |

### Category B — Power tools (any logic, any API)

These are the "escape hatches" that let an agent do anything.

| Tool | What it does |
|---|---|
| **HTTP Request Tool** | Let the agent call any HTTP API. The `$fromAI()` mechanism fills in URL params / body / headers. |
| **Custom Code Tool** | Run JS or Python. The agent fills in inputs via `$fromAI()`, gets your code's output back. |
| **Call n8n Workflow Tool** | Call a sub-workflow as a tool. **Session 3 and the demo used this.** |
| **AI Agent Tool** | A sub-agent as a tool. **Session 5 uses this.** |

### Category C — Integrations as tools (~400 services)

[Full list in the Tools Agent docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/)

**Any of n8n's ~400 integration nodes can be a tool.** You drop the node's "Tool" variant onto the Tool port, configure which operation (e.g., Gmail → Send Message, Sheets → Append Row, Calendar → Create Event), and use `$fromAI()` to let the LLM fill in parameters dynamically.

Common ones:
- **Gmail Tool** — send email, create draft, label, search
- **Google Sheets Tool** — append row, update row, query
- **Google Calendar Tool** — create event, query events
- **Slack Tool** — post message, reply in thread
- **Notion Tool** — create page, query database, update row
- **Jira / Linear / Trello / Asana Tools** — create tickets, update status
- **Postgres / MySQL Tools** — run SQL queries
- **Salesforce / HubSpot Tools** — CRM operations

### The `$fromAI()` expression — the key mechanism

Any tool parameter can use the expression:

```javascript
{{ $fromAI('field_name', 'description of what the LLM should put here', 'type') }}
```

This tells n8n "let the LLM fill this field at runtime, based on the description". The LLM sees the description as a parameter hint and fills it. This is how natural language becomes structured action.

[Docs: using $fromAI()](https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/)

---

## Part 5 — How data actually flows

This is the mental model most beginners get wrong. Once you get it, n8n clicks.

### Every node receives an array, emits an array

```
[node A] → [{a: 1}, {a: 2}, {a: 3}]  (an array of 3 items)
       ↓
[node B]    ← receives all 3, runs 3 times by default
       ↓
[{b: 1}, {b: 2}, {b: 3}]  ← emits 3 items
```

### Node execution is "once per item" by default

Most nodes run their logic once per input item. If a Gmail "Send Email" node receives 5 items, it sends 5 emails.

**Exception — sub-nodes**: sub-nodes (like Chat Model, Memory, Tool) don't iterate like main nodes. They always see "the first item" in expressions. This is why agents don't naturally loop — you'd use Loop Over Items + the agent inside.

### Expressions reference the data stream

```javascript
{{ $json.field }}              // current item's field
{{ $node["Webhook"].json.x }}  // first item from a specific node
{{ $('Edit Fields').all() }}   // all items from a named node
{{ $now.toISO() }}             // current datetime
{{ $workflow.id }}             // the workflow's ID
```

Expressions are wrapped in `{{ }}` and support JavaScript. [Full reference](https://docs.n8n.io/data/expressions/).

### When to use Aggregate vs Split Out

- **Aggregate**: you have N items, you want 1 item with all N packed into an array field. Use before feeding to an LLM for batch processing.
- **Split Out**: you have 1 item with an array field, you want N items. Use after an LLM returns an array and each element needs separate processing.

---

## Part 6 — The canonical patterns (what you've seen across the training)

| Pattern | Trigger | Middle | Output | Training session |
|---|---|---|---|---|
| **Event-triggered classifier + action** | App trigger (Gmail, Webhook) | Text Classifier chain + IF/Switch | Draft email, label, notify | S1 |
| **Scheduled proactive pipeline** | Schedule | Fetch → Aggregate → Summarization/Basic LLM Chain | Send email, post to Slack | S2 |
| **Interactive agent with action tools** | Chat | AI Agent + Memory + action tools (via `$fromAI()`) | Reply in chat + real actions in Sheets/Calendar/etc. | S3 |
| **RAG (two workflows)** | Ingestion: Drive / Manual; Query: Chat | Ingestion: Loader + Splitter + Embeddings + Vector Store. Query: Agent + Vector Store Tool + Memory. | Grounded answers with citations | S4 |
| **Multi-agent orchestration** | Chat | Supervisor AI Agent + N × AI Agent Tool specialists | Coordinated multi-step output | S5 |
| **Integration glue** | App trigger | IF/Switch + action nodes | Cross-system state change | (Q&A) |
| **Human-in-the-loop AI** | Chat or app event | AI Agent + Human Review tool (pauses for Slack approval) | Approved action | (Stretch) |
| **Custom API endpoint** | Webhook | Logic nodes (IF/Code/HTTP) + Respond to Webhook | HTTP response | (General) |

---

## Part 7 — Where IF and Switch actually live

You asked specifically: "where are IF and Switch?" — they're under the **Core** category in the node picker. When you click `+` to add a node and see the six categories:

```
AI
Action in an app
Data transformation        ← Edit Fields, Aggregate, Split Out, Filter, Sort
Flow                       ← ★ IF, Switch, Merge, Loop Over Items, Wait, NoOp
Core                       ← HTTP Request, Webhook, Code, Execute Sub-workflow, Set, Schedule Trigger
Human review
```

**IF and Switch live under "Flow".** That's n8n's control-flow category. Merge, Loop Over Items, Wait also live there.

`Data transformation` is the reshape category — no branching, just changing data.
`Core` is the power-user category — HTTP, Code, Webhook, anything without an app-specific UI.

---

## Cheat sheet — what node do I need?

**"I want to…"**

| Goal | Node |
|---|---|
| Start the workflow manually | Manual Trigger |
| Start on a schedule | Schedule Trigger |
| Start when an email arrives | Gmail Trigger (for Gmail) or Email Trigger IMAP |
| Start when an HTTP request hits my URL | Webhook |
| Start when a user chats with the bot | Chat Trigger |
| Branch 2 ways based on a condition | IF |
| Branch 3+ ways | Switch |
| Drop items that don't match a condition | Filter |
| Combine data from 2 upstream nodes | Merge |
| Batch items to avoid rate limits | Loop Over Items |
| Pause the workflow for N seconds | Wait |
| Add / modify fields on items | Edit Fields (Set) |
| Collapse N items → 1 item | Aggregate |
| Expand 1 item's array field → N items | Split Out |
| Call any REST API | HTTP Request |
| Write custom JS / Python | Code |
| Call another n8n workflow | Execute Sub-workflow |
| Classify text into categories | Text Classifier (chain) |
| Summarize text | Summarization Chain |
| Build a chat agent | AI Agent + Chat Model + Memory (+ tools) |
| Build a document Q&A bot | Vector Store (ingestion) + AI Agent with Vector Store Tool (query) |
| Let the agent call a sub-agent | AI Agent Tool |
| Let the agent call any HTTP API at runtime | HTTP Request Tool |
| Let the agent call another workflow | Call n8n Workflow Tool |

---

## Further reading — the 5 most useful official docs

1. **[Flow logic overview](https://docs.n8n.io/flow-logic/)** — the canonical splitting/merging/looping/waiting reference
2. **[LangChain concepts in n8n](https://docs.n8n.io/advanced-ai/langchain/langchain-n8n/)** — the full AI cluster node catalog
3. **[RAG in n8n](https://docs.n8n.io/advanced-ai/rag-in-n8n/)** — retrieval patterns end to end
4. **[Understanding tools](https://docs.n8n.io/advanced-ai/examples/understand-tools/)** — what "tool" means in n8n
5. **[Data structure](https://docs.n8n.io/data/data-structure/)** — how items and arrays actually work
