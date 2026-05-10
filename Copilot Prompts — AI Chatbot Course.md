# Copilot Prompts — AI Chatbot Course

```
Changes:
**P1.2 Layer 1** — Narrative rewritten to describe the Amzur proxy correctly. Students now understand they have a virtual key, not individual provider keys, and that every call needs their email for tracking.

**P1.2 Layer 3** — `LITELLM_BASE_URL` → `LITELLM_PROXY_URL` throughout. Also adds both the `ChatOpenAI` LangChain instance and a raw `OpenAI` client singleton, since later projects (image gen, embeddings) need both patterns.

**P1.3 Layer 3** — `stream_chat` now takes `user_email` as a parameter and passes it via `config={"metadata": {...}}` on every chain invocation. This propagates the pattern to every downstream prompt that calls `stream_chat`.

**P4.2 Layer 3** — `stream_chat` signature updated to include `user_email`, and the chain config metadata pattern is explicit here too where memory is wired in.

**P6.1 Layer 3** — `generate_image` now takes `user_email`, passes `user=user_email` on the API call, and the router is told to pass `current_user.email` in.

**P7.1 Layer 2** — "OpenAI credentials must come from environment variables" replaced with a clear statement that embeddings go through the LiteLLM proxy using the same virtual key.

**P7.1 Layer 3** — `openai` removed from requirements (not needed directly), `OPENAI_EMBEDDING_MODEL` + `OPENAI_API_KEY` replaced with `LITELLM_EMBEDDING_MODEL` + `LITELLM_PROXY_URL` + `LITELLM_API_KEY`. The `OpenAIEmbeddings` call now shows the full proxy-pointing constructor with a comment explaining the virtual key distinction.

**P8.1 Layer 3** — `run_nl_to_sql` now takes `user_email` and passes it through agent config metadata so LiteLLM can track usage on agent-generated LLM calls too.
```

## How to Use This File

Every prompt in this file has three layers. Use them in order:

**🟦 Layer 1 — Why Are We Building This?** Read this before touching Copilot. It explains what you're building and why in plain English. No code, no jargon.

**🟨 Layer 2 — Student Prompt** This is what you type into Copilot Chat. It follows a four-part structure you'll use throughout the course:

- **Context** — what already exists in your project  
- **Goal** — what you want to build right now  
- **Rules** — constraints Copilot must follow  
- **Output** — what you expect to receive

Read it, understand it, then paste it. Over time, try writing your own version before reading this one.

**🟥 Layer 3 — Reference Prompt** The detailed technical version used to generate the instructor's reference implementation. After you've run your prompt and reviewed the output, compare it to this — you'll see what extra precision buys you.

---

**Before running any prompt:**

- Make sure `.github/copilot-instructions.md` is in your project root  
- Open the files from the previous prompt in your editor — Copilot reads open files as context  
- Run prompts in order within each project  
- Review every file Copilot generates before accepting it

---

---

# PROJECT 1 — Basic Chatbot

**The big picture:** By the end of this project you'll have a working chatbot. You type a message in the browser, it goes to your backend, your backend asks the AI, and the answer streams back word by word. No login, no history yet — just the core loop working end to end.

---

### P1.1 — Project Structure

---

#### 🟦 Layer 1 — Why Are We Building This?

Before writing any feature code, we need to set up the skeleton of the project — the folders, the config files, and the entry points. Think of this like building the frame of a house before adding walls and furniture. Getting the structure right now means every prompt that follows has a consistent place to put things. We're also setting up a config system so that sensitive information like API keys never gets hardcoded into the code.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I am starting a brand new project from scratch. Nothing exists yet.
I have a copilot-instructions.md file in my .github folder that describes
the folder structure and tech stack I want to use.

Goal:
Set up the empty project structure for both the frontend and backend.
I don't want any feature code yet — just the scaffolding and config.

For the backend (Python + FastAPI):
- Create the folder structure described in copilot-instructions.md
- Create a main entry point file for the FastAPI app
- Create a config file that reads settings from a .env file
- Create a requirements.txt with all the libraries I'll need for the full project
- Create a .env.example file that lists all the environment variables I'll need,
  with the values left blank

For the frontend (React + TypeScript + Tailwind CSS):
- Set up a new React project using Vite
- Create a file for making API calls to the backend
- Create a file for shared TypeScript types (empty for now)

Rules:
- No feature code — structure and config files only
- API keys and secrets must never be written directly in code files,
  only loaded from environment variables
- The frontend should be configured to talk to the backend on localhost

Output:
The full folder structure with empty or minimal files in place,
ready for feature development to begin.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using the folder structure defined in copilot-instructions.md, scaffold the complete
empty project directory for both the frontend and backend.

For the backend, create:
- backend/app/__init__.py
- backend/app/main.py (FastAPI app entry point with CORS configured for localhost:5173)
- backend/app/core/config.py (Settings class using pydantic-settings, loading from .env)
- backend/requirements.txt (fastapi, uvicorn, pydantic-settings, python-dotenv, langchain,
  langchain-openai, litellm, python-jose[cryptography], passlib[bcrypt], asyncpg,
  sqlalchemy, alembic, httpx)
- .env.example with all variables from copilot-instructions.md, values left blank

For the frontend, scaffold a new React + TypeScript + Tailwind CSS project using Vite.
Create:
- frontend/src/lib/api.ts (empty axios instance pointing to http://localhost:8000)
- frontend/src/types/index.ts (empty, placeholder for shared types)

Do not create any feature code yet. Structure and config only.
```

---

### P1.2 — LiteLLM Client \+ Basic Chat Chain

---

#### 🟦 Layer 1 — Why Are We Building This?

Our app talks to AI models through Amzur's shared LiteLLM gateway — a centralised server at `litellm.amzur.com` that handles all AI calls for the team. Think of it like a shared switchboard: you send your request to one place, and it routes it to the right model (Gemini, GPT-4o, etc.) on your behalf. You don't need individual API keys for each provider — your LiteLLM virtual key issued by your admin is all you need.

On top of that, we use LangChain to build the actual "chain" — the logic that takes a user's message, passes it to the AI, and returns a response. These two pieces are the engine of the chatbot. Every AI call must include your Amzur email address so usage can be tracked per person.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a basic FastAPI project structure set up.
I have a copilot-instructions.md file that describes how LiteLLM and LangChain
should be used in this project.

Goal:
Build the AI engine for the chatbot — the piece that takes a user's message,
sends it to the AI model, and returns a response.

I need three things:
1. A single shared AI client (using LiteLLM) that the whole app can use.
   It should read the model name, API URL, and API key from environment variables.
2. A text file containing the system prompt — the instructions that tell the AI
   how to behave (helpful, concise, etc.)
3. A "chain" that connects the system prompt, the user's message, and the AI client
   together into one pipeline.

Rules:
- The AI client should be created once and reused — not recreated on every message
- The model name must come from an environment variable, not be hardcoded
- The system prompt must be stored in a separate text file, not written inside the code
- Use the modern LangChain style described in copilot-instructions.md (LCEL)

Output:
Three files: the AI client, the system prompt text file, and the chain.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the LiteLLM client and a
basic LangChain chat chain for the backend.

Create backend/app/ai/llm.py:
- A module-level ChatOpenAI singleton pointing at settings.LITELLM_PROXY_URL
- model=settings.LLM_MODEL, base_url=settings.LITELLM_PROXY_URL,
  api_key=settings.LITELLM_API_KEY, timeout=30, max_retries=2
- Also create a raw OpenAI client singleton for direct API calls:
  client = OpenAI(api_key=settings.LITELLM_API_KEY, base_url=settings.LITELLM_PROXY_URL)
- Export both as module-level instances: `llm` and `client`

Create backend/app/ai/prompts/chat_system.txt:
- A system prompt for a helpful AI assistant
- Instructs the assistant to be concise and clear

Create backend/app/ai/chains/chat_chain.py:
- A build_chat_chain() function using LCEL: prompt | llm | StrOutputParser()
- Load the system prompt from chat_system.txt using pathlib, not a hardcoded string
- The chain accepts `human_input` and `user_email` variables
- user_email is passed via chain config metadata on every invocation — not in the prompt template
- Export the chain as a module-level instance built by calling build_chat_chain()
```

---

### P1.3 — Chat Endpoint (Streaming)

---

#### 🟦 Layer 1 — Why Are We Building This?

Now we need to expose the AI chain to the outside world through an API endpoint. When the frontend sends a message, it hits this endpoint, which passes the message to the AI and streams the response back token by token — the same way ChatGPT types out its answer word by word rather than making you wait for the whole thing. This "streaming" approach makes the app feel fast and responsive even when the AI takes a few seconds.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a FastAPI backend and a working AI chain that can respond to a user message.
My copilot-instructions.md describes the layered architecture I'm following:
routers handle HTTP, services contain logic.

Goal:
Create an API endpoint that the frontend can call to chat with the AI.
The endpoint should stream the response back word by word, not wait for
the full answer before responding.

I need:
1. A service function that calls the AI chain and streams back the response tokens
2. A schema that defines what the request looks like (just a message field)
3. An API route at POST /api/chat/stream that accepts the message,
   streams the AI response, and signals when it's done

Rules:
- The response must stream token by token, not all at once
- Use Server-Sent Events (SSE) format: each token sent as "data: {token}"
- Send a final "data: [DONE]" event when streaming is complete
- Business logic goes in the service, not the router
- Register the router in main.py

Output:
Three files: the service, the schema, and the router. Plus an update to main.py.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the FastAPI chat router and service.

Create backend/app/services/chat_service.py:
- async def stream_chat(user_message: str, user_email: str) -> AsyncIterator[str]
- Calls the chat_chain using .astream()
- Passes user_email via config={"metadata": {"user_email": user_email}} on every invocation
- Yields each token as it arrives

Create backend/app/schemas/chat.py:
- ChatRequest: pydantic model with field `message: str`
- ChatResponse: pydantic model with field `content: str`

Create backend/app/api/chat.py:
- POST /api/chat/stream endpoint
- Accepts ChatRequest
- Returns StreamingResponse with media_type="text/event-stream"
- Each streamed chunk formatted as: f"data: {token}\n\n"
- Sends "data: [DONE]\n\n" as the final event

Register the router in backend/app/main.py with prefix /api.
```

---

### P1.4 — React Chat UI

---

#### 🟦 Layer 1 — Why Are We Building This?

This is what the user actually sees and interacts with. We need a chat window that shows the conversation, a text box to type messages, and the ability to display the AI's response as it streams in live. We're also setting up the data types and the hook (a reusable piece of logic) that manages the chat state — things like the list of messages and whether a response is currently streaming.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a React + TypeScript + Tailwind CSS frontend project.
I have a streaming chat endpoint at POST /api/chat/stream on my backend.
My copilot-instructions.md describes the component and hook conventions to follow.

Goal:
Build the chat interface — the part the user sees and interacts with.

I need:
1. A TypeScript type for a chat message (with an id, a role of "user" or "assistant",
   and the message content)
2. A component that displays the list of messages, with user messages on the right
   and AI messages on the left. AI messages should render markdown and code blocks.
3. An input bar at the bottom with a text area and a send button.
   Pressing Enter should send the message. Shift+Enter should add a new line.
4. A hook that manages the chat logic: sending messages, receiving the streaming
   response token by token, and tracking whether a response is in progress.
5. A page that puts all these pieces together.

Rules:
- Use Tailwind CSS for all styling — no separate CSS files
- The AI response must appear word by word as it streams in, not all at once
- The send button should be disabled while a response is streaming
- All API calls go through /src/lib/api.ts, not directly in components
- Use react-markdown to render AI message content

Output:
Five files: the type definition, the message list component, the input bar component,
the chat hook, and the chat page. Plus an update to App.tsx.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the chat UI in React with Tailwind CSS.

Create frontend/src/types/index.ts:
- Message type: { id: string, role: "user" | "assistant", content: string }

Create frontend/src/components/chat/MessageList.tsx:
- Renders a list of Message objects
- User messages right-aligned, assistant messages left-aligned
- Uses react-markdown with rehype-highlight for assistant message content
- Auto-scrolls to the latest message

Create frontend/src/components/chat/InputBar.tsx:
- Textarea input (expands with content, max 5 rows)
- Send button, disabled while a response is streaming
- Submits on Enter (Shift+Enter for newline)
- Clears input after submit

Create frontend/src/hooks/useChat.ts:
- Manages messages state (array of Message)
- sendMessage(content: string): connects to POST /api/chat/stream via fetch with streaming
- Parses "data: ..." SSE lines, accumulates tokens into the assistant message in real time
- Handles [DONE] event to mark streaming complete
- Exposes: messages, sendMessage, isStreaming

Create frontend/src/pages/ChatPage.tsx:
- Composes MessageList and InputBar
- Full viewport height layout using Tailwind

Update frontend/src/App.tsx to render ChatPage.
```

---

---

# PROJECT 2 — Persistent Chat Storage \+ Form-Based Login

**The big picture:** Right now the chatbot forgets everything when you refresh the page, and anyone can use it. In this project we add two things: a database to store conversations permanently, and a login system so each user has their own chat history. We're using email and password for login, with proper security practices.

---

### P2.1 — Database Setup

---

#### 🟦 Layer 1 — Why Are We Building This?

A database is how we make the app remember things permanently. We're using PostgreSQL — a reliable, widely-used database. Before we can store anything, we need to define the "tables" — think of these like spreadsheets with defined columns. We need a table for users and a table for messages. We're also setting up Alembic, a tool that tracks changes to our database structure over time, like version control for your database.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a FastAPI backend with a working chat endpoint.
I want to add a PostgreSQL database to store users and messages.
My copilot-instructions.md describes the database setup conventions.

Goal:
Set up the database connection and define the tables for users and messages.

I need:
1. A database connection file that creates a shared connection pool and
   a reusable "session" that routes can use to talk to the database
2. A User table with columns for: id, email, name, password (stored securely —
   never plain text), google login id (can be empty for now), profile picture URL,
   and a created date
3. A Message table with columns for: id, the id of the user who sent it,
   whether it was sent by the user or the AI, the message content, and a created date
4. A database migration — a file that applies these table definitions to the actual database

Rules:
- Passwords must never be stored as plain text — store a hashed version only
- Both the password field and the Google login id field should be allowed to be empty
  (this will make sense in Project 3)
- Use UUIDs (unique identifiers) as the primary key for all tables, not auto-incrementing numbers
- All dates should be stored in UTC timezone
- Use Alembic to generate the migration file — do not modify the database manually

Output:
The database session file, the two model files, the Alembic setup, and the first migration.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, set up the database layer.

Create backend/app/db/session.py:
- Async SQLAlchemy engine using settings.DATABASE_URL
- AsyncSessionLocal sessionmaker
- async def get_db() dependency that yields a session and closes it

Create backend/app/db/base.py:
- Declarative Base class for all ORM models

Create backend/app/models/user.py:
- User model with fields: id (UUID, pk), email (str, unique), name (str),
  hashed_password (str, nullable), google_id (str, nullable),
  avatar_url (str, nullable), created_at (DateTime timezone=True)
- hashed_password and google_id are both nullable — intentional per copilot-instructions.md

Create backend/app/models/message.py:
- Message model with fields: id (UUID, pk), user_id (UUID, FK to users),
  role (str — "user" or "assistant"), content (str), created_at (DateTime timezone=True)

Initialize Alembic in backend/ and generate the first migration for both models.
```

---

### P2.2 — Auth Service (Register \+ Login Logic)

---

#### 🟦 Layer 1 — Why Are We Building This?

When a user registers, we can't store their password as plain text — if the database were ever compromised, all passwords would be exposed. Instead we "hash" it: run it through a one-way algorithm that scrambles it permanently. When the user logs in later, we hash what they typed and compare it to the stored hash. We're also building JWTs (JSON Web Tokens) — think of these as a signed hall pass the server gives you after login. Every subsequent request includes this pass, so the server knows who you are without you having to log in again on every page.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a User model in my database with fields for email, name, and hashed_password.
My copilot-instructions.md describes the auth conventions for this project.

Goal:
Build the security logic for registering and logging in users.

I need three things in an auth utility file:
1. A function to hash a password before saving it
2. A function to check whether a typed password matches a stored hash
3. A function to create a login token (JWT) that contains the user's ID and email,
   signed with a secret key from my environment variables, and set to expire after
   a configurable number of minutes
4. A function that reads the login token from the request's cookies, decodes it,
   looks up the user in the database, and returns their details.
   This will be used to protect pages that require login.

I also need a service file with:
5. A register function — check if the email is taken, hash the password, save the user
6. A login function — find the user by email, check the password, return the user

Rules:
- Passwords must be hashed using bcrypt
- The JWT secret key must come from environment variables, never hardcoded
- The login token must be stored in a secure httpOnly cookie —
  this means JavaScript in the browser cannot access it, which is more secure
- If registration fails (email taken) return a clear error
- If login fails (wrong email or password) return a 401 error

Output:
Two files: the auth utilities file and the auth service file. Plus a schemas file
that defines what a register request and login request look like.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the auth service layer.

Create backend/app/core/auth.py:
- hash_password(plain: str) -> str using passlib bcrypt
- verify_password(plain: str, hashed: str) -> bool
- create_access_token(data: dict) -> str — signs JWT with settings.SECRET_KEY,
  expiry from settings.JWT_EXPIRE_MINUTES
- get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User
  — reads JWT from httpOnly cookie named "access_token"
  — decodes it, looks up user by UUID in DB
  — raises HTTPException 401 if missing or invalid

Create backend/app/services/auth_service.py:
- async def register_user(db, email, name, password) -> User
  — check if email already exists, raise 400 if so
  — hash password, create and persist User record
- async def login_user(db, email, password) -> User
  — look up user by email, verify password
  — raise 401 if not found or wrong password

Create backend/app/schemas/auth.py:
- RegisterRequest: email, name, password (min 8 chars)
- LoginRequest: email, password
- UserResponse: id, email, name, avatar_url
```

---

### P2.3 — Auth Endpoints (Register \+ Login Routes)

---

#### 🟦 Layer 1 — Why Are We Building This?

The security logic we built in the last step lives in the service layer — it doesn't talk to the outside world yet. Now we need to expose it through API endpoints that the frontend can call. When a user fills in the registration form and clicks Submit, the frontend calls our register endpoint. When they log in, it calls the login endpoint, which returns the login token baked into a cookie. We're also building a "who am I?" endpoint the frontend can call on page load to check if the user is already logged in.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have auth service functions for registering and logging in users.
I have a get_current_user function that reads a login token from a cookie.
My copilot-instructions.md describes how routes should be structured.

Goal:
.
Create the API endpoints that the frontend will call for auth.

I need four routes in an auth router file:
1. POST /api/auth/register — accepts email, name, password. Creates the user.
   Returns the user's details (but never their password).
2. POST /api/auth/login — accepts email and password. On success, creates a login
   token and saves it as a secure cookie on the response. Returns the user's details.
3. POST /api/auth/logout — clears the login cookie. Returns a confirmation message.
4. GET /api/auth/me — a protected route. Uses the login token from the cookie to
   identify who is calling it and returns their details. Returns a 401 if not logged in.

Rules:
- The login token must be set as an httpOnly cookie — never returned in the response body
- The /me endpoint must be protected — it should fail with a 401 if there is no valid token
- Register the router in main.py so the routes are active

Output:
The auth router file, registered in main.py.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the auth API router.

Create backend/app/api/auth.py:
- POST /api/auth/register
  — calls auth_service.register_user
  — returns UserResponse
- POST /api/auth/login
  — calls auth_service.login_user
  — on success, creates JWT via create_access_token
  — sets httpOnly cookie "access_token" (secure=False in dev, samesite="lax")
  — returns UserResponse
- POST /api/auth/logout
  — clears the "access_token" cookie
  — returns {"message": "logged out"}
- GET /api/auth/me
  — protected with Depends(get_current_user)
  — returns UserResponse of current user

Register the router in main.py with prefix /api.
```

---

### P2.4 — Message Persistence

---

#### 🟦 Layer 1 — Why Are We Building This?

Currently messages disappear the moment you close the browser. We need to save them to the database so when a user logs in, their conversation history is still there. Every message — both the user's and the AI's — gets saved with a reference to the user who owns it. We also need a way to retrieve the full history when the user opens the app.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a working chat streaming endpoint and a messages table in my database.
Users can now log in. My copilot-instructions.md describes the service layer pattern.

Goal:
Update the chat system so that every message is saved to the database,
and users can retrieve their full chat history.

I need to:
1. Add a function to the chat service that saves a single message to the database
   (accepting: user id, role — "user" or "assistant" — and the message content)
2. Add a function that retrieves all messages for a given user from the database
3. Update the streaming chat function so that:
   - It saves the user's message to the database before streaming
   - It assembles the full AI response as it streams, then saves it to the database
     after streaming is complete
4. Create a new endpoint GET /api/messages that returns the full message history
   for whoever is currently logged in

Rules:
- The chat streaming endpoint should now require the user to be logged in
- Message history should be returned in chronological order (oldest first)
- The full AI response must be assembled and saved only after streaming completes,
  not piece by piece

Output:
Updated chat service and chat router, a new messages router, and a message schema.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, update the chat service and endpoint to
persist messages to the database and load history on request.

Update backend/app/services/chat_service.py:
- async def save_message(db, user_id, role, content) -> Message
- async def get_messages(db, user_id) -> list[Message]
- Update stream_chat to accept user_id and db, and save both the user message
  and the fully assembled assistant response after streaming completes

Update backend/app/schemas/chat.py:
- MessageResponse: id, role, content, created_at

Create backend/app/api/messages.py:
- GET /api/messages — protected route, returns list[MessageResponse] for current user
- Calls chat_service.get_messages with current user's id

Update backend/app/api/chat.py:
- Protect POST /api/chat/stream with Depends(get_current_user)
- Pass user_id and db into stream_chat
```

---

### P2.5 — Login UI \+ Protected Frontend Routes

---

#### 🟦 Layer 1 — Why Are We Building This?

The backend now knows how to log in and remember users — but the frontend still lets anyone in. We need a login form, and we need the chat page to be "protected" — meaning if you're not logged in, you get redirected to the login page. We also want to load the user's message history from the database when they log in so the conversation picks up where they left off.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a React frontend and a backend with working login and message history endpoints.
My copilot-instructions.md describes how auth state and API calls should be managed.

Goal:
Add a login form to the frontend and protect the chat page so only
logged-in users can access it. Also load chat history on login.

I need:
1. Auth helper functions (in /src/lib/auth.ts) for: logging in, logging out,
   and checking who is currently logged in by calling GET /api/auth/me
2. A hook (useAuth) that checks on page load if the user is already logged in,
   and exposes the current user, a login function, and a logout function
3. A login form component with email and password fields, a submit button,
   and an error message if login fails
4. An update to the chat hook so that when it loads, it fetches the message
   history from GET /api/messages and shows it in the chat window
5. An update to App.tsx so that:
   - If the user is not logged in, show the login form
   - If logged in, show the chat page with a logout button in the header

Rules:
- All API calls go through /src/lib/api.ts
- Never store the login token in code — the browser handles the cookie automatically
- Use TanStack Query (React Query) to fetch the current user on page load
- The logout button should call the logout function and return the user to the login form

Output:
The auth library file, the useAuth hook, the login form component,
and updates to the chat hook and App.tsx.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the login form and protect the chat
page behind authentication.

Update frontend/src/types/index.ts:
- Add User type: { id: string, email: string, name: string, avatar_url: string | null }

Create frontend/src/lib/auth.ts:
- login(email, password): POST /api/auth/login, returns User
- logout(): POST /api/auth/logout
- getMe(): GET /api/auth/me, returns User or null

Create frontend/src/hooks/useAuth.ts:
- Calls getMe() on mount to check session (React Query)
- Exposes: user, isLoading, login, logout

Create frontend/src/components/auth/LoginForm.tsx:
- Email + password inputs
- Submit calls useAuth login
- Shows inline error on failure
- Redirects to chat on success

Update frontend/src/hooks/useChat.ts:
- On mount, call GET /api/messages and prepend history to messages state

Update frontend/src/App.tsx:
- If user is not authenticated, render LoginForm
- If authenticated, render ChatPage
- Show a logout button in the chat page header
```

---

---

# PROJECT 3 — Google OAuth \+ Chat Thread Management

**The big picture:** Two additions in this project. First, we let users log in with their Google account — more convenient than a password, and more appropriate for an internal Amzur tool. Second, we introduce "threads" — separate named conversations, like how ChatGPT lets you have multiple chats. Each thread gets a name automatically generated by the AI.

---

### P3.1 — Thread Database Model

---

#### 🟦 Layer 1 — Why Are We Building This?

Right now all messages are in one big pile per user. We need to organise them into separate conversations — threads. A thread is like a folder for a conversation. It has a title, belongs to a user, and contains messages. We need to add this concept to the database before we can build any of the features around it.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a working database with User and Message tables.
I use Alembic to manage database changes.
My copilot-instructions.md describes the database models I need.

Goal:
Add a Thread table to the database and link messages to threads.

I need:
1. A Thread model with: id, the user it belongs to, a title, and created/updated dates
2. An update to the Message model to add an optional thread id column
   (it should be allowed to be empty so existing messages don't break)
3. A new Alembic migration that applies both of these changes to the database

Rules:
- Use UUID as the primary key for threads
- Dates should be stored in UTC timezone
- The thread id on messages should be optional (nullable) to avoid breaking existing data
- Use Alembic to generate the migration — do not modify the database manually

Output:
The Thread model file, the updated Message model, and the Alembic migration.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, add the Thread model to the database.

Create backend/app/models/thread.py:
- Thread model: id (UUID, pk), user_id (UUID, FK to users), title (str),
  created_at (DateTime timezone=True), updated_at (DateTime timezone=True, onupdate)

Update backend/app/models/message.py:
- Add thread_id (UUID, FK to threads, nullable)

Generate a new Alembic migration for these schema changes.
```

---

### P3.2 — Google OAuth (Login with Google)

---

#### 🟦 Layer 1 — Why Are We Building This?

Google OAuth lets users click "Sign in with Google" instead of typing an email and password. Here's how it works: your app redirects the user to Google's login page, the user approves the connection, and Google redirects them back to your app with a code. Your app exchanges that code for information about the user (their name, email, profile picture). The tricky part is what happens when someone tries to log in with Google using an email that already has a password account — we "auto-link" the accounts so they end up as the same user, not two separate ones. Crucially, the login token (JWT) and cookie setup from Project 2 stays exactly the same — Google OAuth is just a new front door to the same system.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a working email/password login system with JWT tokens stored in httpOnly cookies.
I have a User model with a google_id column that is currently empty for all users.
My copilot-instructions.md describes the Google OAuth auto-link strategy.

Goal:
Add "Sign in with Google" as a second login option. The token and cookie system
from Project 2 must remain completely unchanged — Google OAuth is just a new
way to reach the same outcome.

I need:
1. Two new environment variables: Google Client ID and Google Client Secret
   (obtained from Google Cloud Console)
2. Two new endpoints in the auth router:
   - GET /api/auth/google — redirects the user to Google's login page
   - GET /api/auth/google/callback — handles the redirect back from Google,
     extracts the user's details, and logs them in
3. A new service function that handles the Google login logic:
   - If a user with the same email already exists: update their google_id and
     profile picture, then log them in (this is the auto-link)
   - If no user with that email exists: create a new user (with no password) and log them in
4. After the Google callback succeeds, issue the same JWT cookie as the password
   login flow and redirect to the frontend home page

Rules:
- The JWT structure, the cookie setup, and get_current_user must NOT change
- Never store Google's access token — only store the google_id from their profile
- If the email already exists, silently link the accounts — do not show an error
- The Google Client ID and Secret must come from environment variables

Output:
Updated auth service with the Google login function, updated auth router with
the two new Google endpoints.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, add Google OAuth as a second auth strategy.
The JWT, get_current_user dependency, and cookie handling must remain unchanged from P2.

Add to backend/app/core/config.py:
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI settings

Update backend/app/services/auth_service.py:
- async def google_oauth_login(db, google_id, email, name, avatar_url) -> User
  — if a User with this email exists: populate google_id and avatar_url, save, return User
  — if no User exists: create new User with hashed_password=None, return User

Update backend/app/api/auth.py:
- GET /api/auth/google
  — redirect to Google's OAuth authorization URL with scopes: openid, email, profile
- GET /api/auth/google/callback
  — exchange code for tokens using httpx
  — decode Google's ID token to extract email, name, picture, sub (google_id)
  — call auth_service.google_oauth_login
  — issue same JWT cookie as the password login flow
  — redirect to frontend home page
```

---

### P3.3 — Thread Service \+ Auto-Naming

---

#### 🟦 Layer 1 — Why Are We Building This?

We need to be able to create, rename, and delete threads. We also want threads to get a name automatically — rather than calling every conversation "New Chat", we send the first message in the thread to the AI and ask it to suggest a short title. This makes the thread list actually useful for navigating between conversations.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a Thread model in my database and a working LangChain setup.
My copilot-instructions.md describes how chains and services should be structured.

Goal:
Build the service that manages threads, and an AI chain that automatically
generates a short title for each new thread based on its first message.

I need:
1. A text file (prompt template) that instructs the AI to read a message and
   return a short 4-6 word title summarising the topic — title only, no punctuation
2. A LangChain chain that uses that prompt to generate a thread title
3. A thread service with four functions:
   - Create a thread: generate a title from the first message, save to DB
   - Get all threads for a user
   - Update a thread's title
   - Delete a thread and all its messages

Rules:
- Thread title generation must use the LangChain chain, not a hardcoded string
- The delete function must also delete all messages belonging to the thread
- Service functions follow the pattern in copilot-instructions.md

Output:
The prompt template text file, the title chain file, and the thread service file.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the thread management service and
an LLM chain that auto-generates thread titles.

Create backend/app/ai/prompts/thread_title.txt:
- Prompt that takes the first user message and returns a 4-6 word title.
  Return the title only, no punctuation.

Create backend/app/ai/chains/thread_title_chain.py:
- build_thread_title_chain() using LCEL: prompt | llm | StrOutputParser()
- Accepts `first_message` variable
- Export as module-level instance

Create backend/app/services/thread_service.py:
- async def create_thread(db, user_id, first_message) -> Thread
  — generate title via thread_title_chain, create and persist Thread
- async def get_threads(db, user_id) -> list[Thread]
- async def update_thread_title(db, thread_id, user_id, title) -> Thread
- async def delete_thread(db, thread_id, user_id) -> None
  — also deletes all messages belonging to the thread
```

---

### P3.4 — Thread API Router

---

#### 🟦 Layer 1 — Why Are We Building This?

The thread service logic now needs to be accessible via API endpoints, just like we did with auth and chat. The frontend will call these endpoints to show the list of threads, create a new one when the user clicks "New Chat", rename a thread, and delete one.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a thread service with create, read, update, and delete functions.
All thread operations should require the user to be logged in.
My copilot-instructions.md describes the router/service pattern.

Goal:
Create the API endpoints for thread management and update the chat endpoint
so messages are associated with a thread.

I need:
1. A thread schema file with types for: a thread response, a create request
   (containing the first message), and an update request (containing the new title)
2. A threads router with:
   - GET /api/threads — get all threads for the current user
   - POST /api/threads — create a new thread (auto-names it from the first message)
   - PATCH /api/threads/{thread_id} — update a thread's title
   - DELETE /api/threads/{thread_id} — delete a thread and all its messages
3. An update to the chat endpoint so it requires a thread_id in the request body,
   and messages are saved with that thread_id

Rules:
- All thread routes must require login
- DELETE should return a 204 status (no content) on success
- Register the threads router in main.py

Output:
The thread schema, the threads router, updated chat router, and updated main.py.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the threads API router.

Create backend/app/schemas/thread.py:
- ThreadResponse: id, title, created_at, updated_at
- ThreadCreateRequest: first_message (str)
- ThreadUpdateRequest: title (str)

Create backend/app/api/threads.py — all routes protected with Depends(get_current_user):
- GET /api/threads — returns list[ThreadResponse] for current user
- POST /api/threads — creates thread, auto-names it, returns ThreadResponse
- PATCH /api/threads/{thread_id} — updates title, returns ThreadResponse
- DELETE /api/threads/{thread_id} — deletes thread and its messages, returns 204

Update backend/app/api/chat.py:
- Add thread_id to ChatRequest
- Messages saved with thread_id

Register threads router in main.py.
```

---

### P3.5 — Thread Sidebar UI \+ Google Login Button

---

#### 🟦 Layer 1 — Why Are We Building This?

Now we connect the threads system to the frontend. We need a sidebar that lists the user's conversations, lets them start a new one, rename or delete existing ones, and switch between them. We're also adding the "Continue with Google" button to the login form so users can use the OAuth flow we built on the backend.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a React frontend with a working chat page and login form.
My backend now has thread endpoints and Google OAuth endpoints.
My copilot-instructions.md describes frontend conventions.

Goal:
Add a thread sidebar to the chat page and a Google login button to the login form.

I need:
1. A threads hook (using TanStack Query) that can: fetch all threads, create a thread,
   rename a thread, and delete a thread
2. A sidebar component that:
   - Lists all the user's threads
   - Has a "New Chat" button at the top
   - Highlights the currently selected thread
   - Lets users double-click a thread title to rename it
   - Shows a delete icon on each thread
   - Shows the user's name and a logout button at the bottom
3. Updates to the chat hook so it:
   - Accepts an active thread id
   - Loads messages for that thread when it changes
   - Sends the thread id with every chat message
4. An update to the chat page to include the sidebar and manage which thread is selected
5. A "Continue with Google" button on the login form that redirects to /api/auth/google

Rules:
- Use TanStack Query for all data fetching — no direct fetch calls in components
- Opening a different thread should load that thread's messages
- All API calls go through /src/lib/api.ts

Output:
The threads hook, the sidebar component, and updates to the chat hook,
chat page, and login form.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, add thread management to the frontend
and a Google login option to the login page.

Update frontend/src/types/index.ts:
- Add Thread type: { id: string, title: string, created_at: string, updated_at: string }

Create frontend/src/hooks/useThreads.ts (TanStack Query):
- useThreads(): GET /api/threads
- useCreateThread(): POST /api/threads
- useDeleteThread(): DELETE /api/threads/:id
- useRenameThread(): PATCH /api/threads/:id

Create frontend/src/components/chat/ThreadSidebar.tsx:
- Thread list with active highlight
- New Chat button
- Rename on double-click (inline edit)
- Delete icon per thread
- User name + logout at bottom

Update frontend/src/hooks/useChat.ts:
- Accept activeThreadId
- Fetch messages for active thread on change
- Send thread_id in stream request

Update frontend/src/pages/ChatPage.tsx:
- Add ThreadSidebar, manage activeThreadId state

Update frontend/src/components/auth/LoginForm.tsx:
- "Continue with Google" button navigating to GET /api/auth/google
```

---

---

# PROJECT 4 — Conversational Memory

**The big picture:** Right now the AI treats every message as if it's the first one — it has no memory of what was said earlier in the conversation. We're going to give it a short-term memory of the last 5 exchanges so it can understand follow-up questions and references to earlier parts of the conversation.

---

### P4.1 — Memory-Aware Chat Chain

---

#### 🟦 Layer 1 — Why Are We Building This?

When you ask a follow-up question like "can you explain that differently?", the AI currently has no idea what "that" refers to. We need to include the recent conversation history when we send a message to the AI. We keep only the last 5 back-and-forth exchanges (10 messages total) — enough for context without sending too much data and increasing costs.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a chat chain that takes a user message and a system prompt and returns a response.
My copilot-instructions.md describes how memory should be implemented.

Goal:
Update the chat chain so it can receive the recent conversation history
and use it when forming a response.

I need to:
1. Update the system prompt text file to include a section about using
   the provided conversation history to understand context
2. Update the chat chain so it accepts a list of previous messages
   (the history) in addition to the current user message.
   Use LangChain's MessagesPlaceholder for the history slot.
   The chain should accept two inputs: the current message and the history list.

Rules:
- Use ChatPromptTemplate with a system message, a history placeholder,
  and the current human message
- Do not store the history in memory inside the chain — it will be passed in
  from outside on every request
- Follow the LCEL chain style described in copilot-instructions.md

Output:
Updated system prompt text file and updated chat chain file.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, update the chat chain to accept and use
conversation history as a sliding window of the last 5 exchanges.

Update backend/app/ai/prompts/chat_system.txt:
- Add {history} section instructing the model to use conversation history when relevant

Update backend/app/ai/chains/chat_chain.py:
- Update to use ChatPromptTemplate with:
  SystemMessage + MessagesPlaceholder("history") + HumanMessage for current input
- Chain accepts both `human_input` and `history` (list[BaseMessage]) variables
```

---

### P4.2 — Memory Loading \+ Wiring

---

#### 🟦 Layer 1 — Why Are We Building This?

The chain can now accept history, but nothing is passing history to it yet. We need to fetch the last 5 exchanges from the database every time a user sends a message, convert them into the format LangChain expects, and pass them into the chain. The memory lives in the database — not in the server's RAM — so it works correctly even if the server restarts.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have an updated chat chain that accepts a history list.
Messages are stored in the database with a thread_id.
My copilot-instructions.md describes the memory sliding window approach.

Goal:
Load the last 5 exchanges from the database for the active thread
and pass them into the chat chain on every message.

I need to:
1. Add a function to the chat service that:
   - Fetches the last 10 messages for a thread (5 user + 5 AI = 5 exchanges)
   - Converts them to LangChain message objects
     (user messages become HumanMessage, AI messages become AIMessage)
   - Returns them in chronological order (oldest first)
2. Update the stream_chat function to call this new function and
   pass the result as the history into the chain

Rules:
- Fetch messages ordered newest-first (to get the last 10), then reverse for chronological order
- Do not keep history in server memory between requests — always load fresh from DB
- The memory window is exactly 5 exchanges (10 messages) — no more

Output:
Updated chat service file only. The chain and router interface do not change.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the memory loading logic and wire it
into the chat stream endpoint.

Update backend/app/services/chat_service.py:
- async def get_thread_memory(db, thread_id) -> list[BaseMessage]
  — fetch last 10 messages for thread ordered DESC, convert to HumanMessage/AIMessage,
    return in chronological order
- Update stream_chat signature to: stream_chat(user_message, user_email, thread_id, db)
- Pass history into chain invocation
- Pass user_email via config={"metadata": {"user_email": user_email}} on every chain call
```

---

---

# PROJECT 5 — Multi-Modal Attachments

**The big picture:** We're upgrading the chat so users can attach files alongside their messages — images, videos, code files, and more. The AI can then see and respond to those files as part of the conversation. We also need to store a record of each attachment in the database.

---

### P5.1 — Attachment Model \+ Upload Endpoint

---

#### 🟦 Layer 1 — Why Are We Building This?

Before we can let users attach files, we need somewhere to store them and a way to track them. Files get saved to disk (not directly in the database — databases aren't designed for large files). We save the file's location and type in the database so we can reference it later. We also need an upload endpoint the frontend can call when the user picks a file.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a working chat system with a database. I want to add file attachment support.
My copilot-instructions.md describes the Attachment model and security requirements.

Goal:
Build the backend infrastructure for file uploads — the database record,
the storage logic, and the upload endpoint.

I need:
1. An Attachment database model with: id, the message it belongs to, the file type
   (image/video/code/table/formula), where the file is stored on disk,
   the MIME type, the original filename, and a created date
2. A file service that:
   - Validates the file's MIME type against an allowed list
     (images, video, common code/text files)
   - Checks the file size doesn't exceed the limit set in environment variables
   - Saves the file to the uploads folder using a unique filename
   - Returns an unsaved Attachment object for the caller to persist
3. An upload endpoint at POST /api/files/upload that accepts a file,
   saves it, persists the attachment record, and returns the attachment details
4. A new Alembic migration for the Attachment table

Rules:
- Files must never be stored as blobs in the database — only the file path is stored
- MIME type must be validated server-side — do not trust the file extension
- The uploads folder location must come from environment variables
- The endpoint must require login

Output:
The Attachment model, file service, attachment schema, files router, and migration.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, add the Attachment model and file upload
infrastructure.

Create backend/app/models/attachment.py:
- Attachment: id (UUID), message_id (UUID, FK, nullable), type (str),
  storage_path (str), mime_type (str), original_filename (str), created_at

Create backend/app/services/file_service.py:
- async def save_upload(file: UploadFile, user_id: UUID) -> Attachment
  — validate MIME type, enforce MAX_UPLOAD_MB, save to UPLOAD_DIR/user_id/uuid_filename
  — allowed types: image/jpeg, image/png, image/gif, image/webp,
    video/mp4, video/webm, text/plain, text/x-python, text/csv, application/json

Create backend/app/schemas/attachment.py:
- AttachmentResponse: id, type, mime_type, original_filename

Create backend/app/api/files.py:
- POST /api/files/upload — protected, multipart/form-data, returns AttachmentResponse

Alembic migration for Attachment model.
```

---

### P5.2 — Multi-Modal Chain Update

---

#### 🟦 Layer 1 — Why Are We Building This?

The AI models that support it (including Gemini) can actually look at images and read text files as part of a conversation — not just text messages. We need to update the way we send messages to the AI so that attached files are included. Images get encoded and sent as image data. Text files get included as readable text. This is what "multi-modal" means — multiple types of input in a single message.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a file upload system and a streaming chat endpoint.
The Gemini model via LiteLLM supports multi-modal message content.
My copilot-instructions.md describes how attachments should be handled.

Goal:
Update the chat pipeline so that when a user includes attachments with their message,
those files are included in what gets sent to the AI.

I need to:
1. Update the chat request schema to accept an optional list of attachment IDs
2. Update the stream_chat service function to:
   - Load the attachment records from the database using the provided IDs
   - For image files: read the bytes, encode as base64, include as an image content block
   - For text/code files: read the text content and prepend it to the message
   - For video: include a note that a video was attached
3. Update the chat router to pass the attachment IDs into the service

Rules:
- Attachment loading happens in the service layer, not the router
- Only load attachments that belong to the current user's messages
- Do not modify the streaming or token handling logic

Output:
Updated chat schema, updated chat service, updated chat router.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, update the chat chain and service to include
attachment content when sending messages to the LLM.

Update backend/app/services/chat_service.py:
- Update stream_chat to accept optional attachment_ids: list[UUID]
- Load Attachment records, build multi-modal content blocks:
  image -> base64 image block, text/code -> text prepend, video -> text note

Update backend/app/schemas/chat.py:
- Add attachment_ids: list[UUID] = [] to ChatRequest

Update backend/app/api/chat.py:
- Pass attachment_ids from request into stream_chat
```

---

### P5.3 — Frontend Attachment UI

---

#### 🟦 Layer 1 — Why Are We Building This?

Now we connect the file upload system to what the user sees. We need a button in the input bar to pick files, a preview of selected files before sending, and proper rendering of attachments in the message list — images show as images, videos show with a player, code files show as badges.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a React chat interface with an input bar and message list.
My backend has a file upload endpoint and the chat endpoint now accepts attachment IDs.
My copilot-instructions.md describes the attachment types and component conventions.

Goal:
Update the frontend so users can attach files to messages and see attachments
rendered properly in the conversation.

I need:
1. An attachment preview component that renders different file types differently:
   - Images: show as a thumbnail
   - Videos: show with a video player
   - Code/text files: show as a filename badge with a file icon
2. A file picker component (a paperclip icon button) that:
   - Opens a file browser when clicked
   - Uploads the selected file to POST /api/files/upload immediately
   - Shows a preview of the selected file with a remove button
3. Updates to the input bar to include the file picker and track
   which attachment IDs are pending to be sent with the next message
4. Updates to the message list to show attachments above the text content
   of each message
5. Updates to the TypeScript types to include attachment info on messages

Rules:
- Uploaded files should show as pending previews before the message is sent
- Pending attachments should be cleared after the message is sent
- Only the allowed file types should be selectable (image/*, video/mp4, etc.)
- All upload calls go through /src/lib/api.ts

Output:
The attachment preview component, the file picker component, and updates
to the input bar, message list, and types file.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, update the frontend to support file
attachments and render all attachment types in the message list.

Update frontend/src/types/index.ts:
- Add Attachment type: { id, type, mime_type, original_filename }
- Update Message type to include attachments?: Attachment[]

Create frontend/src/components/attachments/AttachmentPreview.tsx:
- image: <img> thumbnail, video: <video> controls,
  code/text: filename badge with icon

Create frontend/src/components/attachments/AttachmentPicker.tsx:
- Paperclip button, file input, calls POST /api/files/upload on select
- Shows previews with remove (×) button
- Accepts: image/*, video/mp4, video/webm, text/plain, .py, .csv, .json

Update frontend/src/components/chat/InputBar.tsx:
- Integrate AttachmentPicker, track pending IDs, include in stream request, clear on send

Update frontend/src/components/chat/MessageList.tsx:
- Render attachments above message content using AttachmentPreview
```

---

---

# PROJECT 6 — AI Image Generation

**The big picture:** We're adding a new mode to the chatbot — instead of asking a question and getting a text answer, the user can describe an image and the AI will generate it. This uses Google's Gemini 2.0 image generation model. The generated image appears inline in the chat thread.

---

### P6.1 — Image Generation Service \+ Endpoint

---

#### 🟦 Layer 1 — Why Are We Building This?

Image generation is a completely separate capability from the chat pipeline. Rather than passing a message through LangChain, we're calling the Gemini 2.0 image generation model directly via LiteLLM and getting back image data. We save the image to disk and return a URL the frontend can use to display it. This needs its own endpoint, separate from the chat stream.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a FastAPI backend with LiteLLM set up. I have a files router already.
My copilot-instructions.md describes how image generation should be structured.

Goal:
Build a backend endpoint that accepts a text description and returns
an AI-generated image.

I need:
1. A new environment variable for the image generation model name
2. An image generation service that:
   - Accepts a text prompt and a user ID
   - Calls the Gemini 2.0 image generation model via LiteLLM
   - Saves the returned image to the uploads folder with a unique filename
   - Returns the image URL and the original prompt
3. An endpoint at POST /api/chat/generate-image that:
   - Requires login
   - Accepts a prompt (minimum 5 characters)
   - Calls the image service
   - Returns the image URL and prompt
4. A new endpoint to serve the generated images: GET /api/files/generated/{filename}

Rules:
- The image generation model name must come from an environment variable
- Return the image as a URL, not raw binary data in the response
- The serve endpoint must require login — images should not be publicly accessible
- Register the new router in main.py

Output:
The image service, image schema, image router, and updates to the files router,
config, and main.py.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the image generation backend.

Create backend/app/services/image_service.py:
- async def generate_image(prompt: str, user_id: UUID, user_email: str) -> dict
  — call Gemini 2.0 image generation via the LiteLLM proxy (settings.LITELLM_PROXY_URL)
    using settings.IMAGE_GEN_MODEL
  — always pass user=user_email on the API call for Amzur usage tracking
  — save image bytes to UPLOAD_DIR/user_id/generated_{uuid}.png
  — return { "image_url": "/api/files/generated/{filename}", "prompt": prompt }

Create backend/app/schemas/image.py:
- ImageGenRequest: prompt (str, min 5 chars)
- ImageGenResponse: image_url (str), prompt (str)

Create backend/app/api/image.py:
- POST /api/chat/generate-image — protected, returns ImageGenResponse
- Pass current_user.email into generate_image for usage tracking

Add to backend/app/api/files.py:
- GET /api/files/generated/{filename} — protected, serves from UPLOAD_DIR

Add IMAGE_GEN_MODEL to config.py and .env.example. Register router in main.py.
```

---

### P6.2 — Image Generation UI

---

#### 🟦 Layer 1 — Why Are We Building This?

The backend can generate images, but the user has no way to trigger it yet. We need a toggle in the input bar that switches between "Chat" mode and "Image Generation" mode. When image mode is active, the input hint changes, the send button calls the image generation endpoint instead of the chat endpoint, and the returned image appears as a message in the conversation.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a chat interface with an input bar. My backend has a POST /api/chat/generate-image
endpoint that returns an image URL.

Goal:
Add an image generation mode to the chat interface.

I need:
1. A toggle button in the input bar that switches between "Chat" mode and "Image Gen" mode
   - In image gen mode, the input placeholder changes to "Describe an image..."
   - The toggle should be visually distinct so the user knows which mode they're in
2. An update to the chat hook with a sendImageGenRequest function that:
   - Calls POST /api/chat/generate-image with the user's prompt
   - Adds the returned image URL as an assistant message using markdown image syntax
     so react-markdown renders it inline
3. An update to the input bar so that when image gen mode is active,
   clicking send calls sendImageGenRequest instead of sendMessage
4. An update to the message list to show a subtle "Generated image" caption
   below AI-generated images

Rules:
- The attachment picker should be hidden in image gen mode
- Switching modes should clear the current input
- Use existing react-markdown image rendering — no custom image component needed

Output:
The image gen toggle component, and updates to the chat hook,
input bar, and message list.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, add image generation mode to the chat frontend.

Create frontend/src/components/chat/ImageGenToggle.tsx:
- Toggle between "Chat" and "Image Gen" modes
- Changes input placeholder, shows visual active indicator

Update frontend/src/hooks/useChat.ts:
- Add sendImageGenRequest(prompt): calls POST /api/chat/generate-image
  — appends assistant message with "![generated image](image_url)"

Update frontend/src/components/chat/InputBar.tsx:
- Integrate ImageGenToggle
- In image gen mode: send calls sendImageGenRequest, hide attachment picker

Update frontend/src/components/chat/MessageList.tsx:
- Add "Generated image" caption below AI-generated images
```

---

---

# PROJECT 7 — PDF RAG (Chat with a Document)

**The big picture:** RAG stands for Retrieval-Augmented Generation. It means the AI can answer questions about a specific document you give it. You upload a PDF, we break it into chunks, turn those chunks into numerical vectors (embeddings) that capture meaning, and store them in a vector database (ChromaDB). When you ask a question, we find the most relevant chunks and include them in the prompt. The AI answers based on your document, and tells you which parts it used.

---

### P7.1 — PDF Ingestion \+ ChromaDB Setup

---

#### 🟦 Layer 1 — Why Are We Building This?

Before the AI can answer questions about a PDF, we need to process it. A PDF might be hundreds of pages — we can't send the whole thing to the AI. Instead we split it into overlapping chunks of text, convert each chunk into an "embedding" (a list of numbers that captures the meaning of the text), and store those embeddings in ChromaDB — a special database designed for searching by meaning rather than exact words.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a FastAPI backend with file upload support.
I want to add the ability to upload a PDF and index it for question-answering.
My copilot-instructions.md describes the RAG setup with ChromaDB and OpenAI embeddings.

Goal:
Build the pipeline that takes a PDF, breaks it into chunks,
generates embeddings, and stores everything in ChromaDB.

I need:
1. A ChromaDB client file that:
   - Connects to a persistent ChromaDB instance (folder location from env variable)
   - Sets up OpenAI embeddings (model name and API key from env variables)
   - Has a function to get or create a collection by name
2. A PDF ingestion function that:
   - Loads a PDF from a file path
   - Splits it into chunks of 1000 characters with 200 character overlap
   - Generates embeddings for all chunks
   - Stores them in ChromaDB under a collection named after the user
   - Returns how many chunks were stored
3. A new upload endpoint POST /api/files/upload-pdf that:
   - Accepts PDF files only
   - Saves the file to disk
   - Calls the ingestion function
   - Returns a confirmation with the number of chunks indexed

Rules:
- Use the chunk size and overlap specified in copilot-instructions.md
- Each user's PDFs should go into their own ChromaDB collection
- The ChromaDB folder location must come from an environment variable
- Embeddings go through the Amzur LiteLLM proxy — use the same LITELLM_API_KEY
  and LITELLM_PROXY_URL that the chat uses. Do not call OpenAI directly.

Output:
The ChromaDB client file, the PDF ingestion file, and an update to the files router.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the PDF ingestion pipeline.

Add to requirements.txt: chromadb, pypdf, langchain-community, langchain-chroma

Create backend/app/ai/rag/chroma_client.py:
- Persistent ChromaDB client from settings.CHROMA_PERSIST_DIR
- OpenAI embeddings routed through the Amzur LiteLLM proxy:
    OpenAIEmbeddings(
        model=settings.LITELLM_EMBEDDING_MODEL,   # "text-embedding-3-large"
        base_url=settings.LITELLM_PROXY_URL,       # https://litellm.amzur.com
        api_key=settings.LITELLM_API_KEY,          # virtual key — NOT an OpenAI key
    )
- Do NOT use the default OpenAI endpoint — embeddings must go through the proxy
- get_or_create_collection(collection_name: str) -> Chroma vectorstore

Create backend/app/ai/rag/pdf_ingestion.py:
- async def ingest_pdf(file_path: str, collection_name: str) -> int
  — PyPDFLoader -> RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
  — embed and store in ChromaDB collection using the proxy-backed embeddings client
  — return chunk count

Update backend/app/api/files.py:
- POST /api/files/upload-pdf — protected, PDF only
  — save to disk, call ingest_pdf with collection_name = f"user_{user_id}"
  — return { "filename": ..., "chunks_stored": n }
```

---

### P7.2 — RAG Chain

---

#### 🟦 Layer 1 — Why Are We Building This?

Now that the PDF is indexed, we need a chain that uses it to answer questions. When a user asks something, we search ChromaDB for the 4 most relevant chunks from their document and include them in the prompt alongside the question. The AI is instructed to answer only from those chunks — not from its general knowledge — and to tell us which parts of the document it used.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have ChromaDB set up with indexed PDF chunks.
I have an existing chat chain using LCEL.
My copilot-instructions.md describes the RAG chain pattern.

Goal:
Build a new chain that retrieves relevant chunks from the user's ChromaDB collection
and uses them to answer questions about their PDF.

I need:
1. A new system prompt text file for RAG mode that:
   - Tells the AI to answer only using the provided context chunks
   - Tells it to mention the page number if available
   - Tells it to say "I couldn't find that in the document" if the answer isn't there
2. A RAG chain using LCEL that:
   - Takes the user's question
   - Retrieves the 4 most relevant chunks from ChromaDB
   - Passes the question and chunks to the AI
   - Streams the response back
3. A RAG service function that:
   - Builds the retriever for the user's collection
   - Fetches the source chunks first (for citation)
   - Streams the answer
   - Returns both the stream and the source document list
4. An update to the chat endpoint to support a "mode" field:
   if mode is "rag", call the RAG service instead of the regular chat service
   After [DONE], send a final event with the source document metadata

Rules:
- Use LCEL for the chain as described in copilot-instructions.md
- Always retrieve 4 chunks (k=4)
- Always return source documents alongside the answer
- The AI must not answer from general knowledge in RAG mode

Output:
The RAG prompt file, the RAG chain, the RAG service, and an updated chat router.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the RAG retrieval chain using LCEL.

Create backend/app/ai/prompts/rag_system.txt:
- Answer only from context, cite page numbers, say explicitly if not found

Create backend/app/ai/chains/rag_chain.py:
- build_rag_chain(retriever) using LCEL:
  { "context": retriever, "question": RunnablePassthrough() } | prompt | llm | StrOutputParser()

Create backend/app/services/rag_service.py:
- async def stream_rag(user_id, question, db) -> tuple[AsyncIterator[str], list[Document]]
  — build retriever from user's collection (k=4), stream answer, return (stream, sources)

Update backend/app/api/chat.py:
- Add mode: Literal["chat", "rag"] = "chat" to ChatRequest
- If mode == "rag": call rag_service.stream_rag
- After [DONE]: send "data: SOURCES:{json.dumps(sources)}\n\n"
```

---

### P7.3 — PDF Upload UI \+ RAG Mode

---

#### 🟦 Layer 1 — Why Are We Building This?

The last piece is the frontend — giving users a way to upload a PDF, see that it's been indexed, and then switch into "document mode" where their questions are answered using the PDF. We also need to show which parts of the document the AI used to form its answer, so the user can verify it.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a React chat interface. My backend has PDF upload and RAG chat endpoints.
After the [DONE] event, the backend sends a SOURCES event with citation data.
My copilot-instructions.md describes how the frontend should handle RAG mode.

Goal:
Add PDF upload and document question-answering to the frontend.

I need:
1. A PDF upload component that:
   - Has a button to select and upload a PDF
   - Calls POST /api/files/upload-pdf
   - Shows a progress indicator during upload
   - Shows "X chunks indexed — document ready" on success
2. A RAG mode hook that tracks whether a PDF has been indexed and
   whether RAG mode is currently active
3. An update to the chat hook so it:
   - Accepts a mode parameter ("chat" or "rag")
   - Sends the mode in the request body
   - Listens for the SOURCES event after [DONE] and stores the source documents
   - Exposes the sources list
4. A source citations component that shows a collapsible "Sources used" section
   below the AI's answer, with the page number and a short snippet from each chunk
5. Updates to the chat page to include:
   - The PDF uploader in the sidebar
   - A "Document mode" indicator in the input area when RAG is active
   - Source citations below relevant messages

Rules:
- RAG mode should only be activatable after a PDF has been successfully indexed
- Sources should appear below the assistant message they relate to
- The mode toggle should clearly communicate which mode is active

Output:
The PDF uploader, RAG mode hook, source citations component, and updates to
the chat hook and chat page.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, add PDF upload and RAG mode to the frontend.

Create frontend/src/components/attachments/PDFUploader.tsx:
- PDF file picker, calls POST /api/files/upload-pdf
- Shows upload progress and "X chunks indexed" on success

Create frontend/src/hooks/useRagMode.ts:
- isPdfIndexed: boolean, activateRagMode(), deactivateRagMode()

Update frontend/src/hooks/useChat.ts:
- Accept mode: "chat" | "rag"
- Pass mode in stream request
- Parse SOURCES: SSE event, store source docs, expose sources: SourceDocument[]

Create frontend/src/components/chat/SourceCitations.tsx:
- Collapsible "Sources" section with page number + snippet per chunk

Update frontend/src/pages/ChatPage.tsx:
- PDFUploader in sidebar, RAG mode indicator in InputBar, SourceCitations below messages
```

---

---

# PROJECT 8 — Natural Language to SQL

**The big picture:** Instead of writing SQL queries, users can ask questions in plain English about the data in the database — things like "how many users signed up this month?" or "show me the 10 most recent messages". The AI translates the question into a SQL query, runs it, and returns the answer. For safety, the AI is only allowed to read data — it cannot change or delete anything.

---

### P8.1 — NL-to-SQL Agent

---

#### 🟦 Layer 1 — Why Are We Building This?

LangChain has a built-in "SQL agent" — an AI that knows how to look at a database structure, write a SQL query to answer a question, run it, and interpret the results. The most important safety concern here is that we must prevent the AI from accidentally (or intentionally) running queries that modify or delete data. We do this by restricting what SQL statements are allowed to execute.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a FastAPI backend connected to a PostgreSQL database.
I have LangChain set up with a LiteLLM client.
My copilot-instructions.md specifies that NL-to-SQL must be read-only.

Goal:
Build an AI agent that can take a plain English question, generate SQL,
run it against the database, and return the answer — but only for read queries.

I need:
1. A SQL agent builder function that:
   - Connects LangChain's SQL agent to my PostgreSQL database
   - Only exposes non-sensitive tables to the agent
   - BLOCKS any SQL containing INSERT, UPDATE, DELETE, DROP, TRUNCATE, or ALTER
     before it can execute — this is a hard safety requirement
   - Returns both the answer and the SQL query that was generated
2. A query service function that invokes the agent with a question and
   extracts the answer and SQL from the output

Rules:
- This is the most safety-critical prompt in the course — the read-only restriction
  is non-negotiable. Add a comment in the code explaining why this check exists.
- Use create_sql_agent from LangChain
- The agent must include intermediate steps in its output so the SQL is recoverable
- Never expose user passwords or sensitive columns to the agent

Output:
The SQL chain file and the query service file.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the NL-to-SQL agent.
CRITICAL: Agent must be scoped to read-only. Block INSERT, UPDATE, DELETE, DROP,
TRUNCATE, ALTER before execution — check case-insensitively.

Add to requirements.txt: langchain-community

Create backend/app/ai/chains/sql_chain.py:
- build_sql_agent() -> AgentExecutor
  — SQLDatabase.from_uri() with restricted include_tables
  — create_sql_agent with llm, db, verbose=True, return_intermediate_steps=True
  — wrap execution to reject write statements (case-insensitive check)
- Export as module-level instance

Create backend/app/services/query_service.py:
- async def run_nl_to_sql(question: str, user_email: str) -> dict
  — invoke agent with config={"metadata": {"user_email": user_email}}
    so the LiteLLM proxy can track usage for this call
  — extract answer and sql_query from agent output
  — return { "answer": ..., "sql_query": ... }
```

---

### P8.2 — NL-to-SQL Endpoint \+ UI

---

#### 🟦 Layer 1 — Why Are We Building This?

The agent works — now we need to expose it as an API endpoint and build the UI panel where users type their question and see the result. We also show the SQL that was generated so users can learn from it and verify what ran against their database.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a working NL-to-SQL query service.
I have a React frontend with a sidebar.
My copilot-instructions.md describes the router and frontend patterns.

Goal:
Expose the NL-to-SQL capability through an endpoint and build the UI for it.

Backend:
1. A query schema with: the question as input, and the answer + SQL query as output
2. An endpoint at POST /api/query/sql that requires login, calls the query service,
   and returns the answer and the SQL that was run

Frontend:
3. A "Query Database" panel component that:
   - Has a text input for the natural language question
   - Has a submit button that calls POST /api/query/sql
   - Shows the answer in plain text
   - Shows the generated SQL in a collapsible code block with syntax highlighting
   - Shows a "Read-only" badge near the SQL to indicate it's safe
4. A way to open this panel from the sidebar (a "Query DB" button)

Rules:
- The endpoint must require login
- Register the router in main.py
- Show a loading state while the query is running
- Show an error message if the query fails

Output:
The query schema, query router, updated main.py, the SQL query panel component,
and an update to the chat page.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the NL-to-SQL endpoint and UI.

Create backend/app/schemas/query.py:
- NLQueryRequest: question (str)
- NLQueryResponse: answer (str), sql_query (str)

Create backend/app/api/query.py:
- POST /api/query/sql — protected, returns NLQueryResponse

Register in main.py.

Create frontend/src/components/chat/SQLQueryPanel.tsx:
- Question input, submit, answer in plain text
- Collapsible SQL code block with syntax highlighting
- Read-only badge

Update frontend/src/pages/ChatPage.tsx:
- "Query DB" sidebar button shows/hides SQLQueryPanel
```

---

---

# PROJECT 9 — Natural Language Queries on Excel \+ Google Sheets

**The big picture:** The final project extends the NL query capability beyond the database to spreadsheets. Users can upload an Excel file or paste a Google Sheets link, ask a question in plain English, and get an answer. Under the hood, the spreadsheet is loaded into a Pandas DataFrame and a LangChain agent figures out what operations to run on it.

---

### P9.1 — Excel Agent (Pandas)

---

#### 🟦 Layer 1 — Why Are We Building This?

Not all data lives in a database. A lot of real-world data lives in spreadsheets. Pandas is a Python library that's great at working with tabular data — think of it as a programmable version of Excel. LangChain has a "Pandas agent" that can take a natural language question, figure out what Pandas operations would answer it, run them, and explain the result. We're also showing the user what operations ran, so they can learn and verify.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a query service and a file upload system.
My copilot-instructions.md describes the Pandas agent pattern.

Goal:
Build the ability to upload an Excel or CSV file and ask questions about it
in plain English.

I need:
1. An Excel agent builder that:
   - Loads an Excel or CSV file into a Pandas DataFrame
   - Creates a LangChain Pandas dataframe agent that can answer questions about it
   - Includes intermediate steps in the output so we can show what Pandas did
2. A service function that:
   - Takes a file path and a question
   - Builds the agent and runs the question
   - Returns the answer and the Pandas operation that was used
3. A new file upload endpoint POST /api/files/upload-excel that:
   - Accepts .xlsx and .csv files only
   - Saves the file and returns a file ID and storage path

Rules:
- Support both .xlsx and .csv file formats
- The Pandas operation must be extracted and returned — not hidden
- Add pandas and openpyxl to requirements.txt

Output:
The Excel agent chain file, updated query service, and updated files router.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the Excel/CSV NL query agent.

Add to requirements.txt: pandas openpyxl tabulate

Create backend/app/ai/chains/sheet_chain.py:
- build_excel_agent(file_path_or_df) -> AgentExecutor
  — load xlsx/csv into DataFrame if path given
  — create_pandas_dataframe_agent with llm, df, verbose=True, return_intermediate_steps=True

Update backend/app/services/query_service.py:
- async def run_nl_to_excel(file_path: str, question: str) -> dict
  — build agent, invoke, extract answer and pandas_operation
  — return { "answer": ..., "pandas_operation": ... }

Update backend/app/api/files.py:
- POST /api/files/upload-excel — .xlsx and .csv only
  — returns { "file_id": uuid, "storage_path": path }
```

---

### P9.2 — Google Sheets Agent

---

#### 🟦 Layer 1 — Why Are We Building This?

Google Sheets is even more common than Excel in many workplaces. Instead of uploading a file, the user just pastes a link to a Google Sheet. We use a Google Service Account (a special type of Google login for apps, not people) to access the sheet, pull all the data into a Pandas DataFrame, and then run the same Pandas agent as we did for Excel. The user experience is seamless — they just get an answer.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have a working Pandas agent for Excel/CSV files.
I have a Google Service Account JSON configured in my environment variables.
My copilot-instructions.md describes the Google Sheets integration pattern.

Goal:
Add the ability to ask questions about a Google Sheet by pasting its URL.

I need:
1. A Google Sheets service that:
   - Authenticates using the Google Service Account credentials from environment variables
   - Extracts the sheet ID from the provided Google Sheets URL
   - Loads all data from the first worksheet
   - Returns it as a Pandas DataFrame (first row as column headers)
2. A service function that:
   - Takes a Google Sheets URL and a question
   - Loads the sheet into a DataFrame using the service above
   - Reuses the existing Pandas agent to answer the question
   - Returns the answer and the Pandas operation used
3. New endpoint schemas and API routes:
   - POST /api/query/excel — for uploaded Excel/CSV files
   - POST /api/query/sheets — for Google Sheets URLs
   Both return the answer and the operation used.

Rules:
- The Google Service Account credentials must come from environment variables
- Reuse the existing Pandas agent — don't duplicate it
- Add gspread and google-auth to requirements.txt

Output:
The Google Sheets service file, updated query service, updated query schemas and router.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, add Google Sheets support to the query service.

Add to requirements.txt: gspread google-auth

Create backend/app/services/gsheet_service.py:
- async def load_sheet_as_dataframe(sheet_url: str) -> pd.DataFrame
  — authenticate via GOOGLE_SERVICE_ACCOUNT_JSON
  — parse sheet ID from URL, fetch first worksheet, return as DataFrame

Update backend/app/services/query_service.py:
- async def run_nl_to_gsheet(sheet_url: str, question: str) -> dict
  — load DataFrame via gsheet_service, run build_excel_agent, return answer + operation

Update backend/app/schemas/query.py:
- ExcelQueryRequest: question, file_id
- SheetQueryRequest: question, sheet_url
- SheetQueryResponse: answer, pandas_operation

Update backend/app/api/query.py:
- POST /api/query/excel — ExcelQueryRequest -> SheetQueryResponse
- POST /api/query/sheets — SheetQueryRequest -> SheetQueryResponse
```

---

### P9.3 — Data Query UI (Excel \+ Sheets)

---

#### 🟦 Layer 1 — Why Are We Building This?

The last piece of the entire course — the frontend for querying spreadsheets. We need a panel where users can either upload an Excel file or paste a Google Sheets link, ask a question, and see the result. We show the Pandas operation that was used so users understand what happened to their data. This panel sits alongside the SQL query panel we built in Project 8\.

---

#### 🟨 Layer 2 — Student Prompt

```
Context:
I have query endpoints for Excel files and Google Sheets.
I have a SQL query panel in my sidebar.
My copilot-instructions.md describes the frontend patterns.

Goal:
Build the UI for querying spreadsheet data — both uploaded Excel files
and Google Sheets links.

I need:
1. A data query panel component with two tabs:
   Tab 1 — "Excel / CSV":
   - File upload input (accepts .xlsx and .csv)
   - Calls POST /api/files/upload-excel on file select, stores the file ID
   - Question text input and submit button
   - Calls POST /api/query/excel with the file ID and question

   Tab 2 — "Google Sheets":
   - Text input for a Google Sheets URL
   - Question text input and submit button
   - Calls POST /api/query/sheets

   Both tabs show:
   - The answer in plain text
   - A collapsible "Operation used" section with the Pandas code in a code block
   - A note: "This query ran locally on your data. Nothing was stored."

2. An update to the sidebar/chat page so users can switch between:
   SQL Query, Excel/Sheets Query, and the regular chat

Rules:
- Show a loading indicator while queries are running
- Show clear error messages if the query fails
- The "operation used" section should be collapsed by default

Output:
The data query panel component and an update to the chat page.
```

---

#### 🟥 Layer 3 — Reference Prompt

```
Using copilot-instructions.md as context, build the frontend UI for Excel and
Google Sheets querying.

Create frontend/src/components/chat/DataQueryPanel.tsx:
- Tabbed: "Excel / CSV" and "Google Sheets"
- Excel tab: file upload -> POST /api/files/upload-excel (stores file_id),
  question input, POST /api/query/excel
- Sheets tab: URL input, question input, POST /api/query/sheets
- Both: answer in plain text, collapsible Pandas expression code block,
  "This query ran on your data only. No data was stored." note

Update frontend/src/pages/ChatPage.tsx:
- Sidebar toggle switches between Chat, SQL Query, and Data Query (Excel/Sheets) modes
```

