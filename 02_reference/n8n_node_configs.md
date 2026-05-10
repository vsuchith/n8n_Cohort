# n8n Node Configuration Reference

> For every node used across the 5 training sessions: what goes in each field, typical values, and gotchas. Companion to [n8n_concepts.md](n8n_concepts.md) which covers *what* each node is — this doc covers *what to type in the boxes*.

Structure for each node:
- **What it does** — one line
- **Key config fields** — table with purpose, type, typical value
- **Example** — a realistic filled-in config
- **Gotchas** — common failure modes

---

## TRIGGER NODES

### Manual Trigger

**What it does:** Starts the workflow when you click **Execute workflow** in the editor.

**Config fields:** none.

**Example:** just drop the node. That's the whole setup.

**Gotchas:**
- Only one Manual Trigger per workflow.
- It won't fire on a schedule or from external events. Add a real trigger (Webhook, Schedule, Gmail Trigger, etc.) when you're done iterating.

---

### Chat Trigger

**What it does:** Starts the workflow when a user sends a chat message. Provides a built-in chat UI.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Make Chat Publicly Available** | If on, the chat is exposed at a public URL | Off during development; on when ready to share |
| **Mode** | `Hosted Chat` (n8n's built-in UI) or `Embedded Chat` (you embed via the `@n8n/chat` npm package on your own page) | `Hosted Chat` for most cases |
| **Authentication** | `None` / `Basic Auth` / `n8n User Auth` | `None` for internal testing, `Basic Auth` when exposing publicly |
| **Initial Messages** | Greeting shown when a user opens the chat | `"Hi! How can I help?"` |
| **Options → Allow File Uploads** | Toggle to let users attach files | Off unless your flow processes attachments |

**Example:** for a chatbot you test locally, leave all defaults, just set Initial Messages to a greeting. Click Chat button at bottom of canvas to test.

**Gotchas:**
- Chat Trigger must connect to an **AI Agent** or **Chain** root node downstream. Won't work with just HTTP nodes.
- Each Chat Trigger gets its own session ID automatically — Simple Memory picks this up by default (`Session Key = Connected Chat Trigger Node`).
- The Chat button at canvas bottom doesn't require publishing. Only the public URL requires publishing.

---

### Webhook

**What it does:** Creates an HTTP endpoint. Any service can POST/GET to it and trigger the workflow.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **HTTP Method** | Which methods accept | `POST` (most common), `GET`, or mix |
| **Path** | URL path segment after `/webhook/` | Auto-generated UUID, or a custom string like `stripe-events` |
| **Authentication** | `None`, `Basic Auth`, `Header Auth`, `JWT Auth` | `None` for testing; `Header Auth` with a shared secret for production |
| **Respond** | When to return a response | `Immediately` (default, returns 200 right away), `When Last Node Finishes`, or `Using 'Respond to Webhook' Node` |
| **Response Code** | HTTP status to return | `200` default |
| **Response Data** | What body to return | `First Entry JSON` (default) or `All Entries`, `Last Node`, `No Response Body` |

**Example:**
- HTTP Method: `POST`
- Path: `webhook-from-stripe`
- Authentication: `Header Auth` with header `X-Webhook-Secret = <random>`
- Respond: `Immediately`

Your URL becomes: `https://your-n8n/webhook/webhook-from-stripe` (production) or `.../webhook-test/...` (test).

**Gotchas:**
- Test URL and Production URL are **different**. Test URL only listens while "Listen for test event" is active. Production URL requires publishing.
- If you need to return a custom response body (not just 200 OK), set **Respond = Using 'Respond to Webhook' Node** and add a Respond to Webhook node at the end of your flow.
- For webhooks that need to be internet-reachable (not just localhost), you need a tunnel (ngrok/Cloudflare Tunnel) or a public-facing n8n deployment.

---

### Schedule Trigger

**What it does:** Starts the workflow on a time schedule.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Trigger Rule** | `Interval` (every N) or `Cron` (exact cron expression) | `Cron` for anything non-trivial |
| **Trigger Interval** (if Interval mode) | Unit: Seconds / Minutes / Hours / Days / Weeks / Months | `Days` |
| **Hour** (if Days/Weeks mode) | Hour of day (0-23) | `8` for 8 AM |
| **Minute** | Minute of hour | `0` |
| **Cron Expression** (if Cron mode) | Standard 5-field cron | `0 8 * * 1-5` = 8 AM weekdays |

**Example (Session 2):**
- Trigger Rule: `Cron`
- Cron Expression: `0 8 * * 1-5` (8 AM, Monday–Friday)

**Gotchas:**
- Uses the n8n server's timezone. Set `GENERIC_TIMEZONE=Asia/Kolkata` (or similar) as an env var to avoid "8 AM UTC ≠ 8 AM IST" confusion.
- Schedule Trigger only fires when the workflow is **published**. Draft workflows don't run on schedule.
- For testing, right-click the trigger → **Execute step** to fire it manually.

---

### Gmail Trigger

**What it does:** Polls a Gmail account for new messages and starts the workflow for each.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Credential** | Your Google OAuth2 credential | Your `Google (training)` credential |
| **Event** | Only option: `Message Received` | (fixed) |
| **Poll Times → Mode** | `Every Minute`, `Every Hour`, `Custom (Cron)`, etc. | `Every Minute` for dev, `Every 15 Minutes` for production (cost control) |
| **Simplify** | Return a simplified email object vs full Gmail API payload | `On` for most cases |
| **Filters → Label Names or IDs** | Only trigger on emails with these labels | Leave empty to see all; set to `IMPORTANT` or a custom label for targeting |
| **Filters → Search** | Gmail-style search string (`from:@boss.com`, `is:unread`, etc.) | Use to narrow to specific senders/topics |
| **Filters → Read Status** | `Unread and read`, `Unread only`, `Read only` | `Unread only` for inbox processing |
| **Filters → Sender** | Email or part of sender name | Leave empty unless specifically filtering |

**Example (Session 1):**
- Credential: `Google (training)`
- Poll Mode: `Every Minute`
- Simplify: On
- Filters → Read Status: `Unread only`
- Filters → Search: empty (process everything)

**Gotchas:**
- Poll-based — expect 1-minute delay minimum. Real-time push triggers aren't possible with Gmail.
- If the workflow isn't published, Gmail Trigger only fires during manual "Listen for test event" mode.
- "Mark as read" doesn't happen automatically — emails keep matching the trigger until you explicitly mark them read (via a downstream Gmail node with `Mark as Read` action).

---

### Execute Sub-workflow Trigger (aka "When Executed by Another Workflow")

**What it does:** First node of a sub-workflow. Receives data from whichever parent workflow called it.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Input data mode** | `Accept all data` / `Define using fields below` / `Define using JSON example` | `Define using fields below` for typed inputs; `Accept all data` for maximum flexibility |
| **Workflow Inputs → Values** (if Define using fields) | Named input fields with types | Add each parameter: name + type (string, number, boolean, object, array) |
| **Workflow Inputs → JSON Example** (if JSON example mode) | A sample JSON matching expected input | `{"query": "example", "limit": 10}` |

**Example (sub-workflow that does a lookup):**
- Input data mode: `Define using fields below`
- Values: `query` (string), `limit` (number)

**Gotchas:**
- If your parent uses Call n8n Workflow Tool, the **schema defined here** is what the LLM sees as the tool's parameters. Bad schema = bad tool calls.
- Accept all data is forgiving but the Call n8n Workflow Tool v2 may auto-invent an `input` parameter if no schema is defined. Usually fine for simple cases.

---

## FLOW / CORE NODES

### Edit Fields (Set)

**What it does:** Add, modify, or remove fields on items. The "variable assignment" of n8n.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Mode** | `Manual Mapping` (field-by-field) or `JSON` (paste a whole JSON object) | `Manual Mapping` for small changes; `JSON` when you have a complete object to emit |
| **Values to Set** (Manual Mapping) | Rows of field name + type + value | Add one row per field. Value can be fixed or expression. |
| **JSON Output** (JSON mode) | The entire JSON object to emit | `{"meeting": "ATG sync", "date": "2026-04-24", ...}` |
| **Include → Keep Other Fields** / `Keep Only Set` | Whether to keep input fields not mentioned here | `Keep Other Fields` usually; `Keep Only Set` when reshaping |

**Example (Session 1 — fake email for testing):**
- Mode: `JSON`
- JSON Output:
  ```json
  {"from": "boss@example.com", "subject": "Q2 review", "textPlain": "Can you look at this?"}
  ```

**Gotchas:**
- The node is also called "Set" in older n8n versions. Search for both.
- JSON mode requires **valid JSON** — no trailing commas, double quotes only.
- "Keep Only Set" silently drops input data. Use sparingly; usually leave on "Keep Other Fields".

---

### IF

**What it does:** Branches the workflow based on a condition. 2 outputs: `true` and `false`.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Conditions** | One or more comparison conditions | 1+ rows |
| **Condition → Value 1** | Left-hand side of the comparison | `{{ $json.category }}` |
| **Condition → Operator** | Comparison operator. Depends on data type: `equals`, `contains`, `starts with`, `is greater than`, `is after` (for dates), etc. | `equals` |
| **Condition → Value 2** | Right-hand side | `"needs_reply"` |
| **Combine** | `AND` or `OR` when multiple conditions | `AND` default |

**Example (Session 1):**
- Condition:
  - Value 1: `{{ $json.category }}`
  - Data type dropdown: `String`
  - Operator: `equals`
  - Value 2: `needs_reply`

**Gotchas:**
- **Data type matters.** Strings and numbers have different operators. If you pick the wrong type, comparisons silently fail (not errors — just always false).
- **Case sensitivity.** There's an option `Ignore Case` in the settings — off by default. `"Needs_Reply"` ≠ `"needs_reply"` without it.
- Use the **Expression editor** (purple button on a field) when pulling values from upstream nodes.

---

### Switch

**What it does:** Like IF but with N branches instead of 2. Route to different downstream paths.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Mode** | `Rules` (build conditions for each output) or `Expression` (JS expression returning an output index 0, 1, 2...) | `Rules` for readable flows |
| **Routing Rules** | One rule per output branch. Each rule has conditions like IF. | 3-5 rules typically |
| **Rule → Rename Output** | Give a label to the output | `urgent`, `normal`, `spam` |
| **Options → Fallback Output** | Where items that match no rule go: `None` (drop), `Extra Output`, `Output 0` | `Extra Output` is safest |
| **Options → Send data to all matching outputs** | If multiple rules match, go to all matching? | Off default (go to first match) |

**Example (Session 1 stretch — 3 categories):**
- Rules:
  - Rule 1: `{{ $json.category }} equals urgent` → Output "urgent"
  - Rule 2: `{{ $json.category }} equals newsletter` → Output "newsletter"
  - Rule 3: `{{ $json.category }} equals spam` → Output "spam"
- Fallback Output: `Extra Output` (catches unclassified)

**Gotchas:**
- When rules overlap and "Send to all matching" is off, only the first matching rule fires. Order matters.
- Expression mode returns `0`, `1`, `2`... — an integer index to select an output. Useful for computed routing.

---

### Filter

**What it does:** Drops items that don't match a condition. Only matching items pass through.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Conditions** | Same as IF — comparison rules | 1+ rules |
| **Combine** | AND / OR | AND |

**Example:** keep only emails from your boss domain:
- Value 1: `{{ $json.from }}`, Operator: `contains`, Value 2: `@acme.com`

**Gotchas:**
- Filter is a **no-branch** node — no true/false split, just "pass or drop". Use IF if you want both branches.

---

### Merge

**What it does:** Combines 2+ input streams into one.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Mode** | `Append`, `Combine`, `SQL Query` | `Combine` for join-like operations; `Append` to stack |
| **Combine By** (Combine mode) | `Matching Fields`, `Position`, `All Possible Combinations` | `Matching Fields` for joining on a key |
| **Fields to Match** (Matching Fields) | The field names to join on | `{ "field1": "id", "field2": "user_id" }` |
| **Output Type** | `Keep Matches` (inner join), `Keep Non-Matches`, `Keep Everything` (outer), `Enrich Input 1` (left join), `Enrich Input 2` (right join) | `Enrich Input 1` is most common |
| **Number of Inputs** (Append mode) | 2 or more | 2 default |

**Example:** enrich Gmail senders with Sheets rows:
- Mode: Combine
- Combine By: Matching Fields
- Fields: `{"field1": "from", "field2": "email"}`
- Output Type: `Enrich Input 1`

**Gotchas:**
- Both streams must have data for matching modes to work. If one branch has 0 items, you'll get empty output.
- Up to n8n 1.49.0, only 2 inputs were supported. Newer versions allow N inputs in Append mode.

---

### Aggregate

**What it does:** Collapses N items into 1 item with array fields. **Critical for passing multiple items to an LLM in one prompt.**

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Aggregate** | `Individual Fields` (pick specific fields to collect) or `All Item Data (Into a Single List)` | `All Item Data` is the common case |
| **Put Output in Field** (All Item Data) | Name of the array field in the single output item | `events`, `items`, `rows` |
| **Include** (Individual Fields) | Which fields of each item to aggregate | Add rows: `field = "title"`, `name = "titles"` |
| **Options → Keep Missing and Null Values** | Whether to preserve nulls | Usually off |

**Example (Session 2):**
- Aggregate: `All Item Data (Into a Single List)`
- Put Output in Field: `events`

Input: 5 calendar event items → Output: 1 item with `{events: [...5 events]}`.

**Gotchas:**
- The downstream node will now fire **once** (not 5 times). This is intentional — it's why we aggregate before LLM calls.
- To reverse (expand 1 item with array → N items), use **Split Out** node.

---

### Loop Over Items (aka Split In Batches)

**What it does:** Process items in batches of N. Used for rate-limit-safe iteration over large datasets.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Batch Size** | Items per iteration | `1` to process one-by-one; `10-50` for bulk ops with rate limits |
| **Options → Reset** | If on, treats each input as a fresh loop (useful for nested loops) | Off default |

**Two outputs:**
- **Loop** — the current batch. Connect your per-batch logic here; connect the end of that logic back into the Loop Over Items node.
- **Done** — fires once after all batches are processed.

**Example (rate-limit bulk email):**
- Batch Size: 10
- Loop branch: Gmail Send Email → Wait 5 seconds → back to Loop Over Items
- Done branch: log completion

**Gotchas:**
- Most nodes in n8n iterate automatically — you **don't need** Loop Over Items for basic per-item processing. Only use it when you need explicit batching, rate limiting, or when a specific node doesn't iterate properly.
- If you forget to wire the batch-processing branch back into Loop Over Items, the loop runs once and stops.

---

### Wait

**What it does:** Pauses the workflow.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Resume** | `After Time Interval` / `At Specified Time` / `On Webhook Call` / `On Form Submitted` | `After Time Interval` for delays, `On Webhook Call` for human-in-the-loop |
| **Amount** (Time Interval) | Number | `5` |
| **Unit** (Time Interval) | Seconds / Minutes / Hours / Days | `Seconds` |
| **Webhook Suffix** (Webhook mode) | Unique URL path to resume | Auto-generated |

**Example (rate limit):** Amount 5, Unit Seconds.
**Example (human approval):** Resume `On Webhook Call` → Slack message with "approve/reject" buttons → URL to each button is the wait webhook URL + `?decision=approve`.

**Gotchas:**
- Waits > 65 seconds put the execution into a "waiting" state; requires persistent storage mode to resume reliably. OK on default SQLite for small scales; use Postgres for production.

---

### HTTP Request

**What it does:** Call any HTTP API. The swiss army knife when there's no dedicated integration.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Method** | `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, etc. | `GET` or `POST` mostly |
| **URL** | Full URL | `https://api.openweathermap.org/data/2.5/weather` or `={{ "https://api/" + $json.id }}` |
| **Authentication** | `None`, `Basic Auth`, `Header Auth`, `OAuth1/2`, `Generic Credential Type` (pick a credential) | Depends on the API |
| **Send Query Parameters** | Toggle; when on, shows `Query Parameters` editor | `?q=London&appid=...` becomes name/value rows |
| **Send Headers** | Toggle; shows `Headers` editor | `Authorization: Bearer xyz`, `Content-Type: application/json` |
| **Send Body** | Toggle; shows body editor | `JSON` / `Form-Data` / `Raw` body types |
| **Specify Body** (Send Body = on) | `Using Fields Below`, `Using JSON`, `Form URLEncoded`, `n8n Binary File` | `Using JSON` for most APIs |
| **Options → Timeout** | ms | `60000` (60s) for slow APIs |
| **Options → Response Format** | `JSON`, `Text`, `File` | `JSON` default |
| **Options → Batching** | Rate limit config | Leave default unless hitting limits |

**Example (GET weather):**
- Method: GET
- URL: `https://api.openweathermap.org/data/2.5/weather`
- Authentication: None
- Send Query Parameters: On → `q = London`, `appid = {{ $credentials.openweather.key }}`

**Gotchas:**
- **Pagination isn't automatic.** For APIs that paginate, use the `Options → Pagination` setting (cursor / offset / etc.) or manual Loop Over Items.
- **Binary responses** (images, PDFs) need Response Format = `File`.
- When sending JSON body with `={{ ... }}` expressions, make sure the entire body evaluates to valid JSON — expression errors inside produce weird truncated JSON.

---

### Code

**What it does:** Drop to JavaScript or Python for logic the visual nodes can't express.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Language** | `JavaScript` or `Python` | `JavaScript` (Python requires n8n 2.0+ task runners) |
| **Mode** | `Run Once for All Items` (sees full array) or `Run Once for Each Item` (per-item) | `Run Once for All Items` unless you specifically need per-item semantics |
| **JavaScript Code** | The code body | See example |

**Available globals:**
- `$input.all()` — all items from the previous node
- `$input.item` — current item (in "Each Item" mode)
- `$json` — alias for `$input.item.json`
- `$('Node Name').all()` / `.first()` — data from a specific upstream node
- `$now`, `$workflow`, `$execution` — context helpers

**Example (filter + transform):**
```javascript
// Run Once for All Items mode
const items = $input.all();
return items
  .filter(it => it.json.priority === 'high')
  .map(it => ({
    json: {
      id: it.json.id,
      summary: it.json.title.toUpperCase(),
      timestamp: new Date().toISOString(),
    }
  }));
```

**Gotchas:**
- You must **return an array of items** in the shape `[{json: {...}}, ...]`, not plain objects.
- In n8n 2.0, Code nodes run in isolated task runners by default. If you see "task runner" errors, either fix your code or set `N8N_RUNNERS_ENABLED=false` env var (not recommended for production).
- `require()` is disabled by default for security. To use npm modules, enable `NODE_FUNCTION_ALLOW_EXTERNAL` env var.

---

### Execute Sub-workflow

**What it does:** Calls another workflow as a step in the current one.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Source** | `Database` (pick from list) or `Parameter` (inline JSON) | `Database` |
| **Workflow** | The sub-workflow to call | Pick from dropdown |
| **Mode** | `Run Once with All Items` or `Run Once for Each Item` | `Run Once with All Items` usually |
| **Wait For Sub-Workflow Completion** | Wait for it to finish before continuing | `On` default |
| **Workflow Inputs** | Map values to the sub-workflow's defined inputs | `query = {{ $json.searchTerm }}`, etc. |

**Example:**
- Source: Database
- Workflow: `lookup_meeting_info`
- Mode: Run Once with All Items
- Workflow Inputs: `query = {{ $json.text }}`

**Gotchas:**
- The sub-workflow's first node **must** be **Execute Sub-workflow Trigger** (not Manual Trigger) or this node won't find it.
- In n8n 2.0, the sub-workflow must be **Published** for production runs. Manual test execution can still work on drafts.
- Output is what the sub-workflow's **last node** emits. If the last node is a Wait, you may get odd behavior (known historical bug, fixed in 2.0).

---

## AI CLUSTER — ROOT NODES

### AI Agent

**What it does:** The reasoning loop. Receives user input, picks tools, calls LLM, loops until it has an answer.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Source for Prompt** | Where the user's message comes from | `Connected Chat Trigger Node` (default when Chat Trigger is upstream), or `Define Below` for a custom prompt |
| **Prompt (User Message)** (if Define Below) | The prompt template | `{{ $json.question }}` |
| **Options → System Message** | The system prompt guiding behavior | Long string describing role + rules + tools (see Session examples) |
| **Options → Max Iterations** | How many reasoning loops before giving up | `10` default; `5` for testing (fail fast) |
| **Options → Return Intermediate Steps** | Include tool-call trace in output? | Off usually |
| **Options → Automatically Passthrough Binary Images** | For multimodal models | Off unless using vision |

**Three sub-node ports (bottom of node):**
- **Chat Model** — required. Attach OpenAI / Anthropic / Gemini / Ollama Chat Model.
- **Memory** — optional. Attach Simple Memory or Postgres Chat Memory for conversation context.
- **Tool** — optional, accepts multiple. Attach Wikipedia, Calculator, HTTP Request Tool, any integration tool, AI Agent Tool, etc.

**Example (Session 3):**
- Source for Prompt: Connected Chat Trigger Node
- System Message: (long prompt describing the task agent's rules, tools, date context)

**Gotchas:**
- Without a system message, agents behave like ChatGPT — chatty, unfocused. Always set one.
- Without explicit "ALWAYS use a tool" language, agents may answer from general knowledge. Be forceful.
- If the agent loops infinitely, reduce Max Iterations to 5 to see where it's stuck.

---

### AI Agent Tool

**What it does:** A sub-agent. Attaches to a parent AI Agent's Tool port and acts as a tool the parent can call.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Name** | What the parent agent calls this tool (must match references in parent's system message) | `web_research`, `doc_search` |
| **Description** | How the parent decides when to call it. The LLM reads this. | `"Searches general-knowledge topics. Input: a focused query. Output: a 2-3 sentence summary."` |
| **System Message** | The **sub-agent's** system prompt (its own role, narrower than parent's) | `"You are a Wikipedia researcher. Search and summarize in 2 sentences."` |
| **Options → Max Iterations** | Sub-agent's loop cap | `5` |

**Sub-node ports (same as AI Agent):**
- **Chat Model** — its own LLM
- **Memory** — optional, often omitted for specialists
- **Tool** — tools this sub-agent can use

**Example (Session 5 web researcher):**
- Name: `web_research`
- Description: `Researches general-knowledge topics via Wikipedia. Input: a focused query.`
- System Message: `You are a research assistant. Search Wikipedia. Summarize in 2-3 factual sentences. End with "Source: ..."`
- Tool port: Wikipedia sub-node

**Gotchas:**
- The Name must exactly match what the parent's system message references.
- Don't share tools between AI Agent Tools — each should be self-contained for role clarity.

---

### Basic LLM Chain

**What it does:** Simplest chain — send a prompt to an LLM, get a text response. No memory, no tools, no reasoning loop.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Prompt Type** | `Take from Previous Node Automatically` or `Define Below` | `Define Below` for custom prompts |
| **Text** (if Define Below) | The prompt, with expressions | `"Summarize this email in 2 sentences: {{ $json.body }}"` |
| **Require Specific Output Format** | Attach an Output Parser for structured output | Off unless you need JSON output |

**Sub-node ports:**
- **Chat Model** — required
- **Output Parser** — optional, attach Structured Output Parser for JSON schemas

**Example (Session 1 drafter):**
- Prompt Type: Define Below
- Text: (multi-line prompt asking for an email reply)

**Gotchas:**
- Cheapest and fastest AI node. Use it whenever you just need an LLM to transform text.
- No memory — calling it twice with same input gives same output (except for LLM nondeterminism).

---

### Text Classifier

**What it does:** Classifies input text into one of the defined categories.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Text to Classify** | The input text (expression) | `{{ $json.textPlain }}` |
| **Categories** | List of categories with name + description | `[{name: "needs_reply", description: "..."}, ...]` |
| **Options → Fallback** | What to do if no category matches confidently | Usually leave default |
| **Options → Multi-Class Classification** | Allow multiple categories per item | Off default (one category per item) |

**Sub-node ports:**
- **Chat Model** — required

**Example (Session 1):**
- Text: `{{ $json.textPlain }}`
- Categories:
  - Name: `needs_reply`, Description: `A personal message requiring a response — question, request, decision needed.`
  - Name: `fyi`, Description: `Informational — newsletters, notifications, status updates.`

**Gotchas:**
- **Category descriptions are critical.** The LLM uses them to decide. Vague descriptions = wrong classifications.
- Output field: `category` (string name of matched category).

---

### Summarization Chain

**What it does:** Takes text (possibly long), returns a summary. Handles chunking internally for long docs.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Type** | `Map Reduce`, `Refine`, `Stuff` | `Stuff` for short docs (< context window); `Map Reduce` for long docs |
| **Text to Summarize** | Expression | `{{ $json.body }}` |
| **Options → Chunking Strategy** | Auto or manual chunk size | Auto usually |

**Sub-node ports:**
- **Chat Model** — required
- **Document Loader** (for file-based summaries) — optional

**Gotchas:**
- For short text, a Basic LLM Chain with a summarization prompt is simpler and gives you more control. Summarization Chain shines for long docs where chunking matters.

---

### Retrieval Q&A Chain

**What it does:** RAG without an agent. Takes a question, retrieves from a vector store, generates a grounded answer.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Prompt Type** | `Take from Previous Node Automatically` / `Define Below` | |
| **Query** (if Define Below) | The question | `{{ $json.chatInput }}` |

**Sub-node ports:**
- **Chat Model** — required
- **Retriever** — required. Connect a Vector Store in "retrieve" mode.

**When to prefer this over AI Agent + Vector Store Tool:**
- You want deterministic retrieval on every call (agent may skip retrieval if it "thinks it knows")
- You don't need multi-turn memory
- Simpler = better for the specific case

---

## AI CLUSTER — SUB-NODES

### OpenAI Chat Model

**What it does:** The LLM brain for agents and chains.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Credential** | Your OpenAi credential | `OpenAi account` |
| **Model** | Which OpenAI model | `gpt-4o-mini` (cheap, fast), `gpt-4o` (quality), `o1` (reasoning) |
| **Options → Temperature** | Randomness 0-2 | `0.7` default; `0` for deterministic, `1.3` for creative |
| **Options → Max Tokens** | Output cap | Leave default unless you need short outputs |
| **Options → Response Format** | `Text` or `JSON Object` (forces JSON output) | `Text` usually; `JSON Object` only when paired with an output parser |
| **Options → Frequency / Presence Penalty** | Repetition controls | 0 default |

**Gotchas:**
- `gpt-4o-mini` is the right default for most training cases — 10× cheaper than `gpt-4o` with similar quality for simple reasoning.
- Some models are region-restricted (`o1` series). "Model not found" errors often mean your OpenAI account doesn't have access, not that the config is wrong.

**Other chat models** (same shape, different credential and model names):
- **Anthropic Chat Model** — Claude 3/4 (`claude-sonnet-4-6`, `claude-opus-4-7`, etc.)
- **Google Gemini Chat Model** — `gemini-1.5-flash`, `gemini-2.0-flash-exp`
- **Ollama Chat Model** — local models, URL must point at your Ollama instance (e.g., `http://localhost:11434`)

---

### Simple Memory (Window Buffer Memory)

**What it does:** In-process conversation memory. Stores the last N exchanges per session.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Session ID Type** | `Connected Chat Trigger Node` (auto) or `Define below` (custom) | `Connected Chat Trigger Node` default |
| **Session Key** (if Define below) | Expression returning the session ID | `{{ $json.userId }}` or `{{ $json.message.chat.id }}` for Telegram |
| **Context Window Length** | How many prior turns to feed back into the LLM | `5` for basic; `10-20` for richer conversations |

**Gotchas:**
- Not persisted across n8n restarts. **Fine for dev, not for production.**
- Doesn't work in queue mode — each worker has its own memory instance.
- If the agent forgets context, check Context Window Length (default may be too small).

**Swap-in production alternatives** (same port, different config):
- **Postgres Chat Memory** — needs Postgres credential, creates a `chat_history` table, persists across restarts
- **Redis Chat Memory** — needs Redis credential, supports TTL
- **MongoDB Chat Memory** — needs Mongo credential

---

### Wikipedia Tool

**What it does:** Lets the agent search and retrieve Wikipedia articles.

**Key config fields:** **none** — this is a zero-config tool.

**Example:** just attach it to AI Agent's Tool port. Agent sees it as a tool called `Wikipedia`.

**Gotchas:**
- Retrieves article summaries, not full text. For deep research, the agent may need multiple calls.

---

### Calculator Tool

**What it does:** Deterministic math. Solves the "LLMs are bad at arithmetic" problem.

**Key config fields:** **none**.

**Example:** attach to Tool port. Agent uses it for anything numeric.

**Gotchas:**
- Limited to arithmetic + basic math functions. For complex math (integration, stats), use Wolfram Alpha Tool or a Code Tool.

---

### HTTP Request Tool

**What it does:** Lets the agent call any HTTP API at runtime, with the LLM filling in parameters.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Description** | How the agent decides when to call | `"Fetches current weather for a city. Input: city name."` |
| **Method** | HTTP method | `GET` |
| **URL** | Full URL, often with `$fromAI()` | `https://api.weather/city/{{ $fromAI('city', 'city name', 'string') }}` |
| **Authentication** | Same as HTTP Request node | Depends on the API |
| **Send Query Parameters** / **Headers** / **Body** | Same as HTTP Request | With `$fromAI()` expressions inside values |
| **JSON Output** | Whether to parse response as JSON | On for JSON APIs |

**Gotchas:**
- Same caveats as HTTP Request node, plus:
- The LLM can pass malformed or dangerous input. Production: validate inputs before making the request.

---

### Code Tool

**What it does:** Lets the agent run JavaScript/Python code with inputs provided by the LLM.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Description** | How the agent decides when to call | `"Checks if a string is a palindrome. Input: text."` |
| **Language** | `JavaScript` / `Python` | `JavaScript` |
| **Code** | The code body | Access `$fromAI()` inputs via `$input.item.json.<field>` |

**Example:**
```javascript
const text = $input.item.json.text;  // from $fromAI('text', ..., 'string')
return { json: { isPalindrome: text === text.split('').reverse().join('') } };
```

**Gotchas:**
- The return format must match the Code node's (array of `{json: {...}}` objects).
- Useful for custom logic the agent should have access to — data transformation, validation, formatting — without polluting the workflow with separate nodes.

---

### Call n8n Workflow Tool

**What it does:** Lets the agent call another n8n workflow as a tool.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Name** | What the agent calls it | `lookup_meeting_info` |
| **Description** | When the agent should call it | `"Use when asked about meetings, presenters, schedules."` |
| **Source** | `Database` (pick from list) or `Define Below` (inline JSON) | `Database` |
| **Workflow** | Sub-workflow to call | Pick from dropdown |
| **Workflow Inputs → Mapping Mode** | `Define Below` (you provide values) or schema-driven (pulled from sub-workflow's trigger) | |
| **Workflow Inputs → Values** | Per-input expressions. Often use `$fromAI()` | `{query: "{{ $fromAI('query', 'search term', 'string') }}"}` |

**Example (Session 3 task agent — if you used sub-workflow):**
- Name: `lookup_tasks`
- Description: `Fetches tasks from the task spreadsheet.`
- Source: Database
- Workflow: `get_tasks`
- Workflow Inputs: `query = {{ $fromAI('query', ...) }}`

**Gotchas:**
- Sub-workflow must start with Execute Sub-workflow Trigger.
- Sub-workflow must be **Published** (n8n 2.0) or the call fails with "Workflow is not active and cannot be executed". This was Phase 3's demo bug.

---

### Google Sheets Tool (example of integration-as-tool)

**What it does:** Lets the agent read or write a Google Sheet.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Credential** | Your Google OAuth | `Google (training)` |
| **Name** | Agent's tool name | `add_task`, `read_tasks` |
| **Description** | When to use | `"Appends a new row to the task spreadsheet."` |
| **Resource** | What to operate on | `Sheet Within Document` |
| **Operation** | `Append Row`, `Append or Update`, `Get Many`, `Update`, `Delete`, `Clear` | `Append Row` for add, `Get Many` for read |
| **Document** | Pick the spreadsheet from dropdown | `n8n Tasks` |
| **Sheet** | Pick the tab | `Sheet1` |
| **Mapping Column Mode** | `Map Each Column Manually` / `Map Automatically` | `Map Each Column Manually` for agent control |
| **Columns → each field** | Value expression or `$fromAI()` | `task = {{ $fromAI('task', ...) }}` |

**Gotchas:**
- Column names in mapping must match the Sheet's header row exactly (case-sensitive).
- For `Append Row` operations, you need at least a header row pre-filled in the Sheet.

**Same structure** applies to **Gmail Tool**, **Google Calendar Tool**, **Slack Tool**, **Notion Tool**, and every other integration's tool variant.

---

### Simple Vector Store

**What it does:** In-memory vector database. Root node with two operation modes.

**Key config fields (Insert Documents mode):**

| Field | Meaning | Typical value |
|---|---|---|
| **Operation Mode** | `Insert Documents`, `Retrieve Documents (As Tool for AI Agent)`, `Retrieve Documents (For Chain/Agent)`, `Get Many` | Depends on purpose |
| **Memory Key** | Collection name — uniquely identifies this vector store in the instance | `training_docs`, `company_handbook` |

**Sub-node ports:**
- **Document** (Insert mode) — attach Default Data Loader
- **Embedding** — attach Embeddings OpenAI (or other)

**Key config fields (Retrieve-as-Tool mode):**

| Field | Meaning | Typical value |
|---|---|---|
| **Memory Key** | Must match the one used in ingestion | `training_docs` |
| **Name** | Agent sees this as tool name | `search_docs` |
| **Description** | When to use | `"Retrieves passages from uploaded docs."` |
| **Limit** | How many chunks to return per query | `4` for concise; `10` for broader |

**Sub-node port:**
- **Embedding** — must be the **same model** as ingestion

**Gotchas:**
- In-memory only — lost on restart. **Dev/classroom only.**
- Memory Key must match exactly between ingestion and query workflows.
- Embeddings model must match between ingestion and query (both `text-embedding-3-small` etc.).

---

### Default Data Loader

**What it does:** Loads text from binary files or JSON into documents for a Vector Store.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Type of Data** | `JSON` or `Binary` | `Binary` for PDFs, docx, etc.; `JSON` for structured data |
| **Data Format** (Binary) | `Auto-detect`, `PDF`, `DOCX`, `TXT`, `CSV`, `JSON`, `HTML`, `Markdown`, `EPUB` | `Auto-detect` usually works |
| **Mode** | `Load All Input Data` (process all items together) or `Load Specific Data` (point at a field) | `Load All Input Data` for typical RAG |
| **Options → Metadata** | Key-value pairs to attach to each chunk (filename, page, source URL) | Optional but hugely useful for citations |

**Sub-node port:**
- **Text Splitter** — required for long docs. Attach Recursive Character Text Splitter.

**Gotchas:**
- Scanned PDFs (image-only) won't work — they have no text layer. Need OCR first (outside n8n or via OCR node).
- For very large files, memory usage can spike — split ingestion across multiple batches.

---

### Recursive Character Text Splitter

**What it does:** Breaks text into overlapping chunks for embedding.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Chunk Size** | Characters per chunk | `1000` for general text; `500` for Q&A; `2000` for technical docs |
| **Chunk Overlap** | Characters of overlap between adjacent chunks | `200` (roughly 20% of chunk size) |
| **Separators** | Ordered list of separators to try (`\n\n`, `\n`, `. `, ...) | Defaults are good |

**Gotchas:**
- Too-small chunks lose context; too-large chunks retrieve noise. 1000/200 is a safe default for most text.
- For code, use a higher chunk size + different separators (language-specific).

---

### Embeddings OpenAI

**What it does:** Converts text to vectors.

**Key config fields:**

| Field | Meaning | Typical value |
|---|---|---|
| **Credential** | OpenAi credential | `OpenAi account` |
| **Model** | Embedding model | `text-embedding-3-small` (cheap, 1536 dims); `text-embedding-3-large` (better quality, 3072 dims) |
| **Options → Dimensions** | Truncate to N dimensions (only `text-embedding-3-*` supports) | Leave default |
| **Options → Batch Size** | Items per API call | `512` default |

**Gotchas:**
- **Use the same model on ingestion and query.** Different models = incompatible vector spaces = broken retrieval. The #1 silent-failure bug in RAG.
- Cost: $0.02 per million tokens for `-small`; negligible for training.

---

## How to read this doc

- **Open the relevant section** while building a workflow — copy the Example configs, adapt.
- **When a field confuses you**, the "Meaning" column + "Typical value" column give you enough to make a reasonable choice.
- **Gotchas section** is where the pain lives — skim it before you build, not after you're stuck.
- **Link to official docs** is in [n8n_concepts.md](n8n_concepts.md) if you want the full API surface for a given node.

This doc covers **all 30 nodes** used across the 5 training sessions + the demo. If you hit a node not listed here, search the n8n docs directly: every node has a page at `https://docs.n8n.io/integrations/builtin/.../n8n-nodes-(base|langchain).<name>/`.
