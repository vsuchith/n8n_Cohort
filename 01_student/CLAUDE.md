# Copilot Instructions

## Project Overview

Amzur AI Chat is an internal multi-user conversational AI platform. It provides threaded persistent chat, email/password and Google OAuth authentication, conversational memory, multi-modal input (images, video, code, PDF), AI image generation, RAG over uploaded documents, natural language querying of databases and spreadsheets, and business workflow automation via an n8n sidecar (ticket creation, notifications, external system actions).

All AI calls route exclusively through the Amzur LiteLLM proxy at `litellm.amzur.com`. Direct calls to any AI provider (OpenAI, Google, Anthropic) are not permitted.

---

## Tech Stack

| Layer | Technology |
| :---- | :---- |
| Frontend | React 18+, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11+ |
| Database | PostgreSQL — SQLAlchemy 2.0, Alembic migrations |
| AI Orchestration | LangChain (LCEL) |
| LLM Gateway | Amzur LiteLLM Proxy (`litellm.amzur.com`) — all model and embedding calls |
| Models | `gpt-4o`, `gemini/gemini-2.5-flash` (via proxy) |
| Embeddings | `text-embedding-3-large` (via proxy) |
| Vector Store | ChromaDB (persisted to disk) |
| Auth | Email/password (bcrypt \+ JWT) \+ Google OAuth 2.0 |
| File Handling | Images, video, PDF, Excel, Google Sheets |
| Automation Sidecar | n8n Cloud — external business workflow actions (tickets, notifications, integrations) |

---

## Repository Structure

```
/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/           # MessageList, InputBar, ThreadSidebar
│   │   │   ├── attachments/    # File/image/video upload components
│   │   │   └── auth/           # Login, OAuth callback
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/                # API client, auth helpers, utilities
│   │   └── types/              # Shared TypeScript interfaces
│
├── backend/
│   ├── app/
│   │   ├── api/                # Routers — HTTP only, no business logic
│   │   ├── services/           # All business logic
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── ai/
│   │   │   ├── llm.py          # LiteLLM client singletons — import from here
│   │   │   ├── chains/         # LCEL chains, one file per feature
│   │   │   ├── memory/         # Conversation memory utilities
│   │   │   ├── rag/            # ChromaDB client, ingestion, retrieval
│   │   │   └── prompts/        # All prompt templates (.txt / .yaml)
│   │   ├── db/                 # Session factory, Alembic env
│   │   └── core/               # Settings, logging, config
```

---

## Frontend Conventions

### Components

- Functional components and hooks only — no class components  
- Named exports for all components; default exports for page-level components only  
- PascalCase filenames for components (`ChatMessage.tsx`); camelCase for hooks (`useThreadList.ts`)  
- Single responsibility — split any component exceeding \~150 lines

### Tailwind CSS

- Utility classes inline in JSX — no custom CSS files unless Tailwind cannot handle it  
- No `@apply` outside shared design-system components  
- Standard spacing scale — no arbitrary values (`mt-[13px]`, `w-[347px]`, etc.)  
- Dark mode via `dark:` variant — no JS-managed theme toggling

### Rendering Conventions

- Message content rendered via `react-markdown` — never render raw HTML strings from the API  
- Streaming responses render token-by-token — never buffer until completion  
- Support markdown, syntax-highlighted code blocks, and LaTeX in message output

### State Management

- Server state: TanStack Query (React Query) — no `fetch` calls in `useEffect`  
- Local UI state: `useState` / `useReducer`  
- Auth/global state: Zustand or React Context

### API & Types

- All API calls through `/src/lib/api.ts` — never call `fetch` or `axios` directly in components  
- All API response shapes defined in `/src/types/` and imported from there  
- TypeScript strict mode — `any` is a type error  
- Runtime validation of API responses with `zod` where response shape is uncertain

---

## Backend Conventions

### Layered Architecture

Every feature follows this separation — no exceptions:

- **Routers** (`/api/`): parse request → call service → return response. No logic, no DB access.  
- **Services** (`/services/`): all business logic. Framework-agnostic. Fully unit-testable.  
- **Models** (`/models/`): SQLAlchemy ORM definitions only. No methods, no logic.  
- **Schemas** (`/schemas/`): Pydantic I/O models. Always separate from ORM models.

When in doubt about where logic belongs, it belongs in the **service**.

### FastAPI

- `async def` for all route handlers  
- `Depends()` for DB sessions, auth, and shared services — never instantiate inside handlers  
- All routes declare explicit `response_model`  
- Streaming via `StreamingResponse(media_type="text/event-stream")`  
- Structured error responses:

```py
raise HTTPException(
    status_code=404,
    detail={"error": "not_found", "message": "Resource not found"}
)
```

### PostgreSQL \+ SQLAlchemy

- SQLAlchemy 2.0 style (`select()`, mapped columns) — no legacy 1.x patterns  
- Schema changes via Alembic migrations only — never modify the DB directly  
- UUID primary keys on all tables  
- `DateTime(timezone=True)` on all timestamps — store UTC, convert at the API boundary  
- No N+1 queries — use `selectinload` or `joinedload` for related data  
- Feature-specific optional settings typed as `Optional[str] = None` in `config.py` so the app boots without all env vars present

---

## Auth

Two strategies share a single JWT layer. Token structure, `get_current_user`, and the `httpOnly` cookie are identical for both — adding a new strategy does not change anything downstream.

### Email / Password

- Hash passwords with bcrypt on write — never store plaintext  
- Verify hash on login, issue JWT as `httpOnly` cookie (`samesite="lax"`, `secure=False` in dev, `secure=True` behind HTTPS)

### Google OAuth 2.0

- Redirect to Google → exchange code → extract profile → issue same JWT cookie → redirect to frontend  
- **Account linking:** if Google email matches an existing user, populate `google_id` — never create a duplicate user  
- Google-only accounts carry a null `hashed_password`

### JWT

- Signed with `SECRET_KEY` from environment variables, expiry from `JWT_EXPIRE_MINUTES`  
- Stored exclusively in `httpOnly` cookie — never in `localStorage`, response body, or React state  
- `get_current_user` reads from cookie via `Depends()` — no inline auth checks in route handlers

---

## AI Layer

### LiteLLM — Single Gateway (`/ai/llm.py`)

`litellm.amzur.com` is the only permitted entry point for all AI calls. Import clients from `/ai/llm.py` — never instantiate them elsewhere.

**LangChain LLM (for chains):**

```py
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model=settings.LLM_MODEL,
    base_url=settings.LITELLM_PROXY_URL,
    api_key=settings.LITELLM_API_KEY,
    timeout=30,
    max_retries=2,
)
```

**OpenAI SDK client (for direct calls — image gen, embeddings):**

```py
from openai import OpenAI

client = OpenAI(
    api_key=settings.LITELLM_API_KEY,
    base_url=settings.LITELLM_PROXY_URL,
)
```

**Embeddings:**

```py
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(
    model=settings.LITELLM_EMBEDDING_MODEL,
    base_url=settings.LITELLM_PROXY_URL,
    api_key=settings.LITELLM_API_KEY,
)
```

**Usage tracking — required on every call:** Every AI call must include the authenticated user's email for cost attribution and budget enforcement.

```py
# Direct SDK call
client.chat.completions.create(
    model=settings.LLM_MODEL,
    messages=[...],
    user=current_user.email,
    extra_body={
        "metadata": {
            "application": settings.APP_NAME,
            "environment": settings.ENVIRONMENT,
        }
    }
)

# LangChain chain invocation
chain.invoke(
    {"human_input": message, "history": history},
    config={"metadata": {"user_email": current_user.email}}
)
```

**Error handling:**

```py
from openai import OpenAIError

try:
    response = client.chat.completions.create(...)
except OpenAIError as e:
    raise HTTPException(status_code=502, detail={"error": "llm_error", "message": str(e)})
except Exception as e:
    raise HTTPException(status_code=500, detail={"error": "unexpected", "message": str(e)})
```

**Available models:**

- Chat: `gpt-4o`, `gemini/gemini-2.5-flash`  
- Embeddings: `text-embedding-3-large`  
- Image generation: `gemini/imagen-4.0-fast-generate-001` **Usage dashboard:** `https://litellm.amzur.com/ui`

---

### LangChain

- LCEL syntax: `prompt | llm | parser` — no `LLMChain`, `SequentialChain`, or `ConversationalRetrievalChain`  
- Prompt templates in `/ai/prompts/` as `.txt` or `.yaml` — never inline strings in chain definitions  
- All user-facing LLM responses streamed — never block on full completion  
- Multi-step or stateful flows use LangGraph — not sequential chains  
- All AI logic in `/ai/` and `/services/` — never in route handlers

---

## File & Attachment Handling

- Files saved to `UPLOAD_DIR` on disk — never stored as DB blobs  
- DB records path, MIME type, original filename, and type classification only  
- MIME type validated server-side on upload — file extension is not trusted  
- File size enforced via `MAX_UPLOAD_MB` on both frontend and backend  
- Accepted MIME types defined in `settings` — never hardcoded in route handlers or service functions

---

## Environment Variables

```
# App
SECRET_KEY=
JWT_EXPIRE_MINUTES=480
APP_NAME=amzur-ai-chat
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Amzur LiteLLM Proxy
LITELLM_PROXY_URL=https://litellm.amzur.com
LITELLM_API_KEY=sk-
LLM_MODEL=gemini/gemini-2.5-flash
LITELLM_EMBEDDING_MODEL=text-embedding-3-large
IMAGE_GEN_MODEL=gemini/imagen-4.0-fast-generate-001

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# ChromaDB
CHROMA_PERSIST_DIR=./chroma_db

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_JSON=

# File uploads
MAX_UPLOAD_MB=20
UPLOAD_DIR=./uploads

# n8n automation sidecar (optional — app boots without these)
N8N_WEBHOOK_URL=
N8N_API_KEY=
N8N_STATUS_WEBHOOK_URL=
```

---

## n8n Sidecar Implementation

This section extends the existing chatbot instructions above. Keep all existing product conventions in force while adding the sidecar.

## Target User Flow

The user clicks **Create Ticket** in the sidebar tool panel, types a description, and clicks **Submit Ticket**:

```text
React Create Ticket panel (dedicated sidebar tool)
  user fills textarea → clicks Submit Ticket
  ↓
FastAPI POST /api/automations/ticket
  uses existing httpOnly cookie auth
  enriches request with authenticated user email
  ↓
n8n Webhook
  ↓
n8n Normalize Payload (Edit Fields)
  pre-generates ticket_id = "TKT-" + timestamp
  ↓
n8n AI Agent + Structured Output Parser
  classifies: issue, category, priority, assigned_team, next_action, summary
  ↓
n8n PostgreSQL: Insert Ticket
  inserts row into Supabase tickets table
  ↓
n8n Gmail: Send Confirmation
  emails user_email with ticket details
  ↓
n8n Respond to Webhook
  → { success, ticket_id, status, summary }
  ↓
FastAPI returns TicketResponse
  ↓
Panel replaces form with confirmation showing ticket ID and summary
User email inbox receives confirmation
```

The normal chat input is not involved in ticket creation. Do not add regex routing to `handleSend` or modify the chat stream for this feature.

The panel also has a **My Tickets** tab:

```text
React Create Ticket panel → My Tickets tab
  user clicks tab → GET /api/automations/tickets
  ↓
FastAPI queries Supabase tickets table (filtered by user_email)
  ↓
Panel renders ticket list with status dropdown per row
  user changes status dropdown
  ↓
PATCH /api/automations/ticket/{id}/status
  ↓
FastAPI updates Supabase directly → calls n8n Status Notifier (P10.0B)
  ↓
n8n sends Gmail status notification to ticket owner
```

---

## Architecture Rules

1. **React + FastAPI remain the product.**
   n8n does not own the UI, users, sessions, threads, or chat memory.

2. **n8n is called through explicit backend routes.**

   ```text
   POST /api/automations/ticket              — create ticket (calls n8n Ticket Triage)
   GET  /api/automations/tickets             — list tickets for current user (Supabase direct)
   PATCH /api/automations/ticket/{id}/status — update status (Supabase direct, then n8n notification)
   ```

3. **Auth remains unchanged.**
   The frontend authenticates with the existing httpOnly `access_token` cookie. Do not add bearer-token auth, localStorage auth, or an n8n-specific browser auth path.

4. **FastAPI owns identity.**
   Use `get_current_user` in the automation router. Pass `current_user.email` to n8n as payload data.

5. **Do not forward JWTs to n8n.**
   n8n receives only the structured business payload.

6. **Follow the existing repo layering.**

   ```text
   backend/app/schemas/automation.py
   backend/app/services/automation.py
   backend/app/api/automation.py
   backend/app/main.py
   frontend/src/lib/api.ts
   frontend/src/hooks/useChat.ts
   frontend/src/pages/ChatPage.tsx
   ```

7. **n8n is not an AI provider.**
   Calls to the n8n webhook use `httpx.AsyncClient` directly. Do not route n8n calls through LiteLLM.

8. **Tickets are stored in Supabase, not an external sheet.**
   The `tickets` table lives in the same Supabase project as the rest of the app. Create it before testing, preferably through Alembic when committing code.

---

## Database Work: tickets table

The base repo convention is still Alembic for schema changes. If you are implementing this as a normal code change, create an Alembic migration with the schema below.

For the classroom browser workflow, the student may run the same SQL directly in Supabase before testing:

1. Open Supabase → **SQL Editor**
2. Run:

```sql
CREATE TABLE IF NOT EXISTS tickets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     text        UNIQUE NOT NULL,
  user_email    text        NOT NULL,
  issue         text        NOT NULL,
  category      text        NOT NULL DEFAULT 'General',
  priority      text        NOT NULL DEFAULT 'medium',
  status        text        NOT NULL DEFAULT 'open',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  thread_id     text,
  assigned_team text,
  next_action   text
);
```

---

## Manual Browser Work: n8n Workflow 1 — Ticket Creation

Workflow name: `Ticket Triage Sidecar`

**Workflow shape:**

```text
Webhook Trigger
  ↓
Edit Fields: Normalize Payload
  ↓
AI Agent
  ├── OpenAI Chat Model (LiteLLM training credential)
  └── Structured Output Parser
      → { issue, category, priority, assigned_team, next_action, summary }
  ↓
PostgreSQL: Insert Ticket  (Supabase pooler credential)
  ↓
Gmail: Send Confirmation
  ↓
Respond to Webhook
```

**Webhook Trigger:**
- Method: POST
- Authentication: Header Auth — Header Name: `X-N8N-API-KEY`, Header Value: student-chosen secret
- Respond mode: Using Respond to Webhook Node

**Normalize Payload (Edit Fields):**

```text
ticket_id = {{ "TKT-" + $now.toMillis() }}
message   = {{ $json.body.message }}
user_email= {{ $json.body.user_email }}
thread_id = {{ $json.body.thread_id }}
```

Enable: Keep Only Set Fields

**AI Agent prompt text:** `{{ $json.message }}`

**AI Agent system message:**

```text
You are a ticket classification agent for Amzur's IT support system.

Classify the employee's request and extract structured ticket fields.

The ticket ID has already been assigned: {{ $json.ticket_id }}

Rules:
1. issue: Short description of the problem (1–2 sentences)
2. category: One of: IT Support, HR, Admin, Finance, Facilities, Other
3. priority: Infer if not stated — low (inconvenience), medium (blocks some work), high (blocks all work), critical (production outage, client impact, security)
4. assigned_team: IT Support for VPN/laptop/login/network/software/email/access; HR for payroll/leave/benefits; Facilities for office/desk/badge; Finance for invoices/reimbursements; Admin for travel/general; Other for unclassified
5. next_action: One short operational instruction for the assigned team
6. summary: Short classification result. Format exactly: "{category} | {priority} | Team: {assigned_team}"
```

**Structured Output Parser JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "issue": { "type": "string" },
    "category": { "type": "string", "enum": ["IT Support", "HR", "Admin", "Finance", "Facilities", "Other"] },
    "priority": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
    "assigned_team": { "type": "string", "enum": ["IT Support", "HR", "Facilities", "Finance", "Admin", "Other"] },
    "next_action": { "type": "string" },
    "summary": { "type": "string" }
  },
  "required": ["issue", "category", "priority", "assigned_team", "next_action", "summary"]
}
```

**PostgreSQL node (Insert Ticket):**
- Credential: Supabase pooler (Transaction mode, port 6543)
- Operation: Insert
- Table: tickets
- Columns:

```text
ticket_id     = {{ $('Normalize Payload').item.json.ticket_id }}
user_email    = {{ $('Normalize Payload').item.json.user_email }}
issue         = {{ $json.output.issue }}
category      = {{ $json.output.category }}
priority      = {{ $json.output.priority }}
status        = open
thread_id     = {{ $('Normalize Payload').item.json.thread_id }}
assigned_team = {{ $json.output.assigned_team }}
next_action   = {{ $json.output.next_action }}
```

**Gmail node (Send Confirmation):**
- Credential: Gmail OAuth credential
- Operation: Send
- To: `{{ $('Normalize Payload').item.json.user_email }}`
- Subject: `Support Ticket Created: {{ $('Normalize Payload').item.json.ticket_id }}`
- Body (HTML): include ticket_id, issue, category, priority, assigned_team, status from `$('Normalize Payload')` and `$('AI Agent').item.json.output`

**Edit Fields (Set): Shape Response** *(insert before Respond to Webhook)*
- Keep Only Set Fields: ON
- Fields (expression toggle on each value):
  - `success` Boolean `true`
  - `ticket_id` String `{{ $('Normalize Payload').item.json.ticket_id }}`
  - `status` String `open`
  - `summary` String `Created {{ $('Normalize Payload').item.json.ticket_id }} | {{ $json.output.summary }} | Status: Open`

**Respond to Webhook:**
- Respond With: `First Incoming Item's JSON`

---

## Manual Browser Work: n8n Workflow 2 — Status Update

Workflow name: `Ticket Status Notifier`

```text
Webhook (same X-N8N-API-KEY auth)
  ↓
Gmail: Send Status Notification
  To: {{ $json.body.user_email }}
  Subject: Ticket {{ $json.body.ticket_id }} Updated: {{ $json.body.new_status }}
  ↓
Respond to Webhook: { "success": true }
```

Activate this workflow and note its Production URL as `N8N_STATUS_WEBHOOK_URL`.

---

## Backend Implementation

Add to `.env` and `.env.example`:

```bash
N8N_WEBHOOK_URL=
N8N_API_KEY=
N8N_STATUS_WEBHOOK_URL=
```

Add to `backend/app/core/config.py`:

```python
N8N_WEBHOOK_URL: Optional[str] = None
N8N_API_KEY: Optional[str] = None
N8N_STATUS_WEBHOOK_URL: Optional[str] = None
```

Create `backend/app/schemas/automation.py`:

```python
import uuid
from pydantic import BaseModel, Field


class TicketRequest(BaseModel):
    message: str = Field(..., min_length=1)
    thread_id: uuid.UUID | None = None


class TicketResponse(BaseModel):
    success: bool
    ticket_id: str
    status: str
    summary: str


class TicketStatusUpdate(BaseModel):
    new_status: str = Field(..., pattern="^(open|in_progress|resolved|closed)$")
    note: str | None = None


class TicketListItem(BaseModel):
    ticket_id: str
    issue: str
    category: str
    priority: str
    status: str
    assigned_team: str | None = None
    created_at: str
```

Create `backend/app/services/automation.py`:

```python
import httpx

from app.core.config import settings
from app.schemas.automation import TicketResponse


async def create_ticket_via_n8n(*, message: str, user_email: str, thread_id: str | None) -> TicketResponse:
    if not settings.N8N_WEBHOOK_URL or not settings.N8N_API_KEY:
        raise RuntimeError("n8n automation is not configured")
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            settings.N8N_WEBHOOK_URL,
            json={"message": message, "user_email": user_email, "thread_id": thread_id, "source": "ai_forge_chatbot"},
            headers={"X-N8N-API-KEY": settings.N8N_API_KEY},
        )
        response.raise_for_status()
        return TicketResponse.model_validate(response.json())


async def notify_status_via_n8n(*, ticket_id: str, new_status: str, user_email: str, note: str | None) -> None:
    if not settings.N8N_STATUS_WEBHOOK_URL or not settings.N8N_API_KEY:
        return
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(
            settings.N8N_STATUS_WEBHOOK_URL,
            json={"ticket_id": ticket_id, "new_status": new_status, "user_email": user_email, "note": note},
            headers={"X-N8N-API-KEY": settings.N8N_API_KEY},
        )


async def get_tickets_for_user(*, user_email: str, db: AsyncSession) -> list[dict]:
    from sqlalchemy import text
    result = await db.execute(
        text("""
            SELECT ticket_id, issue, category, priority, status,
                   assigned_team, created_at
            FROM tickets
            WHERE user_email = :user_email
            ORDER BY created_at DESC
        """),
        {"user_email": user_email},
    )
    return [dict(row) for row in result.mappings()]
```

Create `backend/app/api/automation.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from httpx import HTTPError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.automation import TicketRequest, TicketResponse, TicketStatusUpdate, TicketListItem
from app.services.automation import create_ticket_via_n8n, notify_status_via_n8n, get_tickets_for_user

router = APIRouter()


@router.post("/ticket", response_model=TicketResponse)
async def create_ticket(payload: TicketRequest, current_user: User = Depends(get_current_user)) -> TicketResponse:
    try:
        return await create_ticket_via_n8n(
            message=payload.message,
            user_email=current_user.email,
            thread_id=str(payload.thread_id) if payload.thread_id else None,
        )
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail={"error": "n8n_failed", "message": str(exc)})


@router.patch("/ticket/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        text("""
            UPDATE tickets
            SET status = :status, updated_at = NOW()
            WHERE ticket_id = :ticket_id AND user_email = :user_email
            RETURNING user_email
        """),
        {
            "status": payload.new_status,
            "ticket_id": ticket_id,
            "user_email": current_user.email,
        },
    )
    row = result.mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.commit()
    try:
        await notify_status_via_n8n(
            ticket_id=ticket_id, new_status=payload.new_status,
            user_email=row["user_email"], note=payload.note,
        )
    except Exception:
        pass
    return {"success": True, "ticket_id": ticket_id, "status": payload.new_status}


@router.get("/tickets", response_model=list[TicketListItem])
async def list_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TicketListItem]:
    rows = await get_tickets_for_user(user_email=current_user.email, db=db)
    return [TicketListItem(**row) for row in rows]
```

> Only returns tickets owned by the authenticated user. Ordered newest first.

Register the router in `backend/app/main.py`:

```python
from app.api import auth, chat, excel, files, image, messages, nl2sql, threads, automation

app.include_router(automation.router, prefix="/api/automations", tags=["automations"])
```

---

## Frontend Implementation

Add an API helper in `frontend/src/lib/api.ts`:

```ts
export const automationApi = {
  createTicket: (message: string, threadId: string | null) =>
    api.post<{
      success: boolean;
      ticket_id: string;
      status: string;
      summary: string;
    }>("/automations/ticket", { message, thread_id: threadId }),

  getTickets: () =>
    api.get<{
      ticket_id: string;
      issue: string;
      category: string;
      priority: string;
      status: string;
      assigned_team: string | null;
      created_at: string;
    }[]>("/automations/tickets"),

  updateTicketStatus: (ticketId: string, newStatus: string, note?: string) =>
    api.patch<{ success: boolean; ticket_id: string; status: string }>(
      `/automations/ticket/${ticketId}/status`,
      { new_status: newStatus, note: note ?? null }
    ),
};
```

Wire the **Create Ticket panel** component (e.g. `CreateTicketPanel.tsx`) to the automation API. The panel has two tabs — **Create** and **My Tickets**. The My Tickets tab includes a status dropdown per row that triggers the full P10.0B bi-directional flow (PATCH → Supabase update → n8n Gmail notification):

```tsx
const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"] as const;

// Create tab state
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);
const [result, setResult] = useState<{ ticket_id: string; summary: string } | null>(null);
const [error, setError] = useState<string | null>(null);

// My Tickets tab state
const [tickets, setTickets] = useState<Ticket[]>([]);
const [ticketsLoading, setTicketsLoading] = useState(false);
const [updatingId, setUpdatingId] = useState<string | null>(null);

// Create ticket
const handleSubmit = async () => {
  setLoading(true); setError(null);
  try {
    const res = await automationApi.createTicket(message, activeThreadId);
    setResult({ ticket_id: res.ticket_id, summary: res.summary });
  } catch {
    setError("Failed to create ticket. Please try again.");
  } finally { setLoading(false); }
};

// Load tickets
const handleLoadTickets = async () => {
  setTicketsLoading(true);
  try { setTickets(await automationApi.getTickets()); }
  finally { setTicketsLoading(false); }
};

// Update status — triggers PATCH → Supabase update → n8n Status Notifier → Gmail
const handleStatusChange = async (ticketId: string, newStatus: string) => {
  setUpdatingId(ticketId);
  try {
    await automationApi.updateTicketStatus(ticketId, newStatus);
    setTickets(prev =>
      prev.map(t => t.ticket_id === ticketId ? { ...t, status: newStatus } : t)
    );
  } finally { setUpdatingId(null); }
};
```

Create tab renders a form; when `result` is set, show confirmation:
```tsx
result ? (
  <div>
    <p>Ticket ID: {result.ticket_id}</p>
    <p>{result.summary}</p>
    <button onClick={() => setResult(null)}>Submit another ticket</button>
  </div>
) : (
  <div>
    <textarea value={message} onChange={e => setMessage(e.target.value)} />
    <button onClick={handleSubmit} disabled={loading || message.trim() === ""}>
      {loading ? "Submitting..." : "Submit Ticket"}
    </button>
    {error && <p>{error}</p>}
  </div>
)
```

My Tickets tab renders a table with a status dropdown per row:
```tsx
<select
  value={t.status}
  disabled={updatingId === t.ticket_id}
  onChange={e => handleStatusChange(t.ticket_id, e.target.value)}
>
  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
</select>
```

Do not modify `handleSend`, `useChat.ts`, or the chat stream. The Create Ticket panel is a self-contained tool — it calls the automation API directly on submit.

---

## Acceptance Tests

Run these before marking the implementation complete:

1. Log in to the chatbot.
2. Confirm existing chat still streams normally.
3. Confirm existing document and query features still work.
4. Click **Create Ticket** in the sidebar → type a description → click **Submit Ticket**:
   ```text
   My VPN is not working since this morning, high priority.
   ```
5. Confirm DevTools shows `POST /api/automations/ticket` returning 200.
6. Confirm Supabase Table Editor → `tickets` table has a new row with `ticket_id`, `user_email`, `issue`, `category`, `priority`, `assigned_team`.
7. Confirm the panel shows the ticket ID and summary confirmation.
8. Confirm the `user_email` inbox received a confirmation email.
9. Click the **My Tickets** tab — confirm `GET /api/automations/tickets` appears in DevTools and the ticket just created is listed.
10. Change the status dropdown for that ticket from `open` to `in_progress` — confirm:
    - DevTools shows `PATCH /api/automations/ticket/{id}/status` returning 200
    - Supabase `tickets` row shows `status = in_progress` and `updated_at` changed
    - Gmail inbox receives a status notification email
11. Send a normal chat message — confirm it streams as usual and no automation endpoint is called.

---

## Common Mistakes to Avoid

- Do not create a standalone chatbot in n8n.
- Do not send every user message to n8n.
- Do not forward JWTs or session data to n8n.
- Do not use `Authorization: Bearer` for browser-to-FastAPI auth.
- Do not store auth tokens in `localStorage`.
- Do not use the n8n Test URL in `.env` after activating the workflow.
- Do not use direct Supabase connection (port 5432) for the n8n PostgreSQL credential — use the Transaction pooler (port 6543).
- Do not add `TICKET_INTENT` regex or any automation routing to `handleSend` — the Create Ticket panel is a dedicated UI tool, not a chat command.
- The `$json.output.xxx` expressions in the PostgreSQL node refer to the AI Agent's structured output — they will be undefined if the Structured Output Parser sub-node is not connected.

---

## Testing

- **Backend:** `pytest` \+ `pytest-asyncio`; `httpx.AsyncClient` for route integration tests; isolated test DB  
- **Frontend:** Vitest \+ React Testing Library  
- **Naming:** `test_<module>.py` / `<Component>.test.tsx`  
- Every service function has a unit test  
- AI chains: mock LiteLLM responses — no real API calls in CI  
- RAG: fixed ChromaDB fixture — no re-embedding per test run

---

## Security

- No secrets, API keys, or model names hardcoded — environment variables only  
- All user input validated by Pydantic schemas before reaching services  
- NL-to-SQL: read-only enforced, case-insensitive keyword block, restricted table scope  
- Auth via `Depends(get_current_user)` only — no inline auth checks  
- MIME type validated server-side on all file uploads — extension not trusted  
- No raw LLM prompt content or AI responses containing PII written to logs

---

## Git & Code Quality

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`  
- Pre-commit hooks: `ruff` (Python linting \+ formatting), `eslint` \+ `prettier` (TypeScript/JSX)  
- All Python functions carry type annotations  
- PRs must not introduce linting errors or failing tests

---

## Copilot Directives

These are standing instructions. Apply them on every generation, regardless of what the prompt asks for.

- Router → service → schema → model. If logic appears in a router, move it to the service.  
- LCEL only for LangChain chains. Never generate `LLMChain`, `SequentialChain`, or `ConversationalRetrievalChain`.  
- Every AI API call includes `user=current_user.email` or `config={"metadata": {"user_email": ...}}`. No exceptions.  
- All AI calls use `settings.LITELLM_PROXY_URL` and `settings.LITELLM_API_KEY`. Never generate a direct OpenAI, Google, or Anthropic API call.  
- `OpenAIEmbeddings` always constructed with `base_url=settings.LITELLM_PROXY_URL` — never the default endpoint.  
- JWT in `httpOnly` cookie only. Never `localStorage`, never the response body.  
- Files to disk. Paths to DB. Never store file content as a database blob.  
- NL-to-SQL keyword block must be case-insensitive. Always include all six: INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER.  
- `SQLDatabase` requires `postgresql+psycopg2://` — always use `_build_sync_db_url()` to convert from `asyncpg`.  
- `return_intermediate_steps=True` on all agents (SQL and Pandas) — required to extract generated query from output.
- Automation webhook calls (`app/services/automation.py`) use `httpx.AsyncClient` directly — never route through LiteLLM. n8n is not an AI endpoint; it is an external service called with a secret header.
- The automation router (`/api/automations`) uses `get_current_user` exactly like all other routers — no separate auth scheme. User identity is passed to n8n as `user_email` in the payload body, not as a token.
- `GET /api/automations/tickets` queries Supabase directly — it does not call n8n. Always filter by `user_email = current_user.email` — never return tickets from other users.
- `PATCH /api/automations/ticket/{id}/status` updates Supabase directly then calls n8n fire-and-forget — the PATCH response must not wait for or depend on n8n succeeding.

---

## Architecture Decisions

Significant decisions that affect the whole codebase. Understand these before changing anything they govern.

**AD-01 — Single AI gateway** All AI calls route through `litellm.amzur.com`. This centralises cost tracking, rate limiting, and provider switching. Adding a new model or switching providers requires only an env var change — no code changes.

**AD-02 — JWT in httpOnly cookie, not Authorization header** The frontend is a browser app. `httpOnly` cookies are inaccessible to JavaScript, which eliminates the most common token exfiltration vector (XSS). Stateless API consumers using Authorization headers are not a current requirement.

**AD-03 — Two-strategy auth, one JWT layer** Email/password and Google OAuth share identical token structure, cookie setup, and `get_current_user`. Adding a third strategy (e.g. Microsoft OAuth) requires only a new service function and two new routes — nothing downstream changes.

**AD-04 — Per-user ChromaDB collections** Each user's embedded documents are stored in an isolated collection (`user_{user_id}`). This prevents cross-user document retrieval and allows per-user collection management (deletion, re-indexing) without affecting other users.

**AD-05 — Memory from DB, not in-process** Conversational memory is fetched fresh from the database on every request. In-process memory stores don't survive server restarts and create correctness issues under concurrent load. The performance cost (one extra DB query per chat message) is acceptable.

**AD-06 — Synchronous driver for LangChain SQL agent** LangChain's `SQLDatabase` uses SQLAlchemy's synchronous reflection path. A separate `psycopg2` driver and URL conversion is required. The FastAPI async path continues to use `asyncpg` unchanged.

**AD-07 — n8n sidecar, not a second product agent** The n8n automation layer is a specialist sidecar: it receives a structured webhook payload from FastAPI, executes one action (e.g. create ticket, send email), and returns a structured result. It knows nothing about conversation history, user sessions, or JWT tokens. The product layer owns identity, routing, and the `tickets` table in Supabase; n8n owns external system actions (PostgreSQL insert, Gmail send). The contract is explicit JSON — `{ message, user_email, thread_id, source }` in, `{ success, ticket_id, status, summary }` out. The flow is bi-directional: ticket creation triggers an n8n confirmation email; `PATCH /api/automations/ticket/{id}/status` updates Supabase directly then calls `N8N_STATUS_WEBHOOK_URL` so n8n sends a status notification email. Never build general chat or session logic inside n8n.

---

## Known Issues

Confirmed bugs and environment-specific issues. Check this section before debugging anything in the affected areas.

**KI-01 — Vite scaffolding via npm** `npm create vite@latest` swallows the `--template` flag and triggers an interactive prompt. → Use `npx create-vite@latest frontend --template react-ts` instead.

**KI-02 — New thread UX flicker** Changing `activeThreadId` in `useChat.ts` triggers a `useEffect` that clears messages, wiping an in-progress streamed response. `setActiveThreadId` in `ChatPage.tsx` must fire immediately after `createThread` resolves, before `sendMessage` is called. Suppress the message-clearing effect for the first render after thread creation using a `justCreatedRef` flag.

**KI-03 — LiteLLM proxy requires VPN** `litellm.amzur.com` is an internal endpoint. `httpx.ConnectError: getaddrinfo failed` means the machine is not on the Amzur VPN. → Connect to VPN. Verify with `nslookup litellm.amzur.com`.

**KI-04 — psycopg2 not in requirements** LangChain's SQL agent imports `psycopg2` at runtime. `ModuleNotFoundError: No module named 'psycopg2'` on agent import means `psycopg2-binary` is missing from `requirements.txt`. → Add `psycopg2-binary` to `requirements.txt`.

**KI-05 — gspread separate from google-auth** `ModuleNotFoundError: No module named 'gspread'` occurs even when `google-auth` is installed. → `gspread` is a separate package. Add it explicitly to `requirements.txt`.

**KI-06 — RAG answers not persisted** If `stream_rag_response` does not receive `db`, `user_uuid`, and `thread_id` parameters, RAG answers are visible during streaming but lost on refresh. The RAG service must call `save_message` for both the user question and the assembled assistant response, matching the chat service pattern.

**KI-07 — PowerShell multi-line Python commands** Newlines in PowerShell `-c "..."` strings trigger multi-line input mode (`>>`), hanging indefinitely. → Use single-line Python one-liners or run each `python -c "..."` invocation separately.

**KI-08 — n8n Production URL vs Test URL** The n8n Webhook node has two URLs: Test URL (only active when "Listen for test event" is clicked) and Production URL (active only after the workflow is toggled Active). `N8N_WEBHOOK_URL` in `.env` must be the Production URL. Using the Test URL in production causes 404 errors from FastAPI with no obvious error message.

**KI-09 — Create Ticket panel is a dedicated sidebar tool, not chat-routed** Ticket creation uses its own panel component (alongside Query DB, Spreadsheets, Document Q&A). Do not add `TICKET_INTENT` regex to `handleSend` or modify `useChat.ts` for ticket flow. The panel calls `automationApi.createTicket()` directly on submit and manages its own loading/result/error state.

**KI-10 — `tickets` table must exist before automation service runs** The automation service inserts into a `tickets` table in Supabase. This table is not created by the existing Alembic migrations — it must be added manually via the Supabase SQL Editor before the first ticket creation call. Without it, `POST /api/automations/ticket` returns a 502 with a PostgreSQL "relation does not exist" error. Migration SQL is in `P10_N8N.md` Part 0.
