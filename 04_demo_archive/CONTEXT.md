# ATG Assignment Assistant — Demo Context

> **Read me first.** This file is the full brief for tonight's n8n demo build.
> Start by reading it top to bottom, then begin Phase 1.

---

## The situation (TL;DR)

- **Meeting:** ATG team sync, tomorrow (2026-04-24) at 11:00 AM.
- **User (me):** presenting Project 14 — "Create agents with n8n" — live.
- **Gene:** presenting the full curriculum assignments overview.
- **Phani:** presenting Project 13 after me.
- **Time to build:** tonight, ~90 minutes of focused work.
- **Deliverable:** one working n8n workflow I can demo in 5-7 minutes, with a clean narrative.

---

## The demo — "ATG Assignment Assistant"

A chat agent built in n8n that can:

1. Answer factual questions (Wikipedia tool)
2. Do calculations (Calculator tool)
3. Remember recent chat context (Window Buffer Memory)
4. **Look up tomorrow's meeting info by calling a second n8n workflow** ← the n8n-specific "why n8n?" moment

The fourth point is the money shot. It's what distinguishes n8n from a plain LLM chatbot.

---

## Architecture

```
[Chat Trigger]
      │
  [AI Agent]  ←── [Google Gemini Chat Model]   (LLM brain)
      │      ←── [Window Buffer Memory]         (session context)
      │      ←── [Wikipedia]                    (zero-config tool)
      │      ←── [Calculator]                   (zero-config tool)
      │      ←── [Call n8n Workflow Tool]       (calls sub-workflow)
                              │
                              ▼
            ┌─────────────────────────────────┐
            │  Sub-workflow: lookup_meeting   │
            │  [Execute Workflow Trigger]     │
            │         ↓                       │
            │  [Set node with meeting data]   │
            └─────────────────────────────────┘
```

---

## Verified technical facts (do not get tripped up by these)

- **There is NO "Agent type" dropdown anymore.** It was removed in n8n v1.82.0. All AI Agent nodes now run as Tools Agent by default. If your version has a dropdown, upgrade to `n8nio/n8n:latest`.
- **Sub-nodes attach to dedicated ports** at the bottom of the AI Agent node: `ai_languageModel`, `ai_memory`, `ai_tool`. Multiple tools attach to the same `ai_tool` port.
- **Window Buffer Memory auto-picks up sessionId from Chat Trigger** — as long as Session Key = "Connected Chat Trigger Node" (the default).
- **The sub-workflow MUST start with an "Execute Workflow Trigger" node**, not a Manual Trigger, or the Call n8n Workflow Tool won't find it.
- **To test without activating:** click the **Chat** button at the bottom of the canvas. No public URL required.
- **Public URL needs workflow activation** (top-right toggle) — only do this after everything is tested.

---

## n8n docs

Use the official n8n documentation when node behavior or field names differ from this archive.

---

## Prerequisites (check before coding)

- [ ] Docker installed and running
- [ ] Google Gemini API key from https://aistudio.google.com/apikey (free, takes 60 seconds)

Docker command to run n8n locally:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Open `http://localhost:5678`, create owner account. Then in n8n's Credentials section, add a new credential of type **"Google Gemini (PaLM) API"** (NOT Google OAuth — they're different) and paste the Gemini key.

---

## Build order — total ~90 minutes

### Phase 1: sub-workflow first (15 min)

Build this before the main workflow so it's ready to wire up as a tool.

1. In n8n, create a new workflow, name it `lookup_meeting_info`.
2. Drop an **Execute Workflow Trigger** node as the entry point. (NOT a Manual Trigger — this matters.)
3. Drop a **Set** node after it. Switch the mode to **JSON** and paste:

```json
{
  "meeting": "ATG team sync",
  "date": "2026-04-24",
  "time": "11:00 AM",
  "presenters": [
    {"name": "Gene", "topic": "Full curriculum assignments overview"},
    {"name": "You", "topic": "Project 14 — n8n agent demo"},
    {"name": "Phani", "topic": "Project 13"}
  ],
  "location": "TBD",
  "notes": "Each presenter demos live. Aim for 5-7 minutes each."
}
```

4. Save. Note the workflow name — the main workflow will reference it.

### Phase 2: main workflow (45 min)

1. Create a new workflow, name it `ATG Assignment Assistant`.
2. Add these nodes in order:

| Node | Type to search | Notes |
|---|---|---|
| Chat Trigger | "Chat Trigger" | Leave defaults. Don't toggle public chat yet. |
| AI Agent | "AI Agent" | Connect Chat Trigger's output to its main input. Set **Source for Prompt = Connected Chat Trigger Node**. No Agent dropdown — ignore any tutorials mentioning it. |
| Google Gemini Chat Model | "Google Gemini Chat Model" | Model: **gemini-1.5-flash** (fast, cheap, good for demo). Connect to AI Agent's `ai_languageModel` port. |
| Window Buffer Memory | "Window Buffer Memory" | Context Window Length: 5. Session Key: "Connected Chat Trigger Node" (default). Connect to `ai_memory` port. |
| Wikipedia | "Wikipedia" | Zero config. Connect to `ai_tool` port. |
| Calculator | "Calculator" | Zero config. Connect to `ai_tool` port. |
| Call n8n Workflow Tool | "Call n8n Workflow Tool" | See config below. Connect to `ai_tool` port. |

**Call n8n Workflow Tool config:**
- **Name** (what the agent sees): `lookup_meeting_info`
- **Description**: `Use this tool when asked about team meetings, presenter assignments, presentation topics, meeting times, or who is presenting what tomorrow.`
- **Workflow**: select `lookup_meeting_info` from the dropdown

3. In the AI Agent node → **Options** → **Add Option** → **System Message** → paste this:

```
You are the ATG Assignment Assistant for Amzur's engineering team.

You have access to three tools:
- Wikipedia: Use for factual questions about people, places, history, science, or well-established technology concepts.
- Calculator: Use for any arithmetic or numeric computation, no matter how simple.
- lookup_meeting_info: Use when asked about team meetings, presenter assignments, presentation topics, meeting times, or who is presenting what tomorrow.

RULES:
1. ALWAYS pick the right tool for the question. Never answer from general knowledge alone if a tool is relevant.
2. If a question needs multiple tools, call them in sequence.
3. For casual conversation ("hi", "how are you"), just respond — no tool needed.
4. Keep answers concise — 2-4 sentences unless detail is requested.
5. Output format: answer first, then on a new line write "Tools used: [list]".

Current date and time: {{ $now.format('cccc, yyyy-MM-dd HH:mm') }}
```

### Phase 3: test with the three live prompts (15 min)

Click the **Chat** button at the bottom of the main workflow canvas. Run these prompts in order. All three must pass.

| # | Prompt | Expected | Proves |
|---|---|---|---|
| 1 | `What is 47 multiplied by 312, and who is Geoffrey Hinton?` | Calls Calculator then Wikipedia | Multi-tool routing |
| 2 | `Who is presenting Project 13 tomorrow, what am I presenting, and when is the meeting?` | Calls `lookup_meeting_info` | **The n8n money shot** — sub-workflow orchestration |
| 3 | `What did I just ask you?` | No tool call — uses memory | Memory works |

If any fail, debug (see "Gotchas" below).

### Phase 4: rehearse once + record backup (15 min)

- Run through the three prompts one more time with the talk script open
- Screen-record a clean run as insurance (in case live demo breaks)

---

## The 5-minute talk script

```
[00:00–00:20] Orientation

"Project 14 in our curriculum asks us to create an agent in n8n. In Project
11 we built essentially the same thing in Langchain — about 100 lines of
Python. Here, the same agent is a 7-node visual workflow with zero code."

[Show canvas, zoomed to 125%.]

[00:20–01:00] Node walkthrough

"Chat Trigger is the entry — it gives us a hosted URL or embedded widget.
The AI Agent is the reasoning loop. Its brain is Gemini, its memory is the
Window Buffer, and it can call three tools: Wikipedia, Calculator, and a
lookup tool that calls another n8n workflow to fetch internal data."

[01:00–02:00] Prompt 1 — multi-tool routing

Type: "What is 47 multiplied by 312, and who is Geoffrey Hinton?"

"Watch the Logs panel at the bottom. The agent decided on its own to call
Calculator first, then Wikipedia, then synthesize. This is the same ReAct
loop you'd see in Langchain's verbose output — Thought → Tool call →
Observation → Thought → next Tool → Final answer — rendered visually."

[02:00–03:30] Prompt 2 — the n8n money shot

Type: "Who is presenting Project 13 tomorrow, what am I presenting,
and when is the meeting?"

"That answer didn't come from the model guessing. The agent picked the
lookup_meeting_info tool, which called a second n8n workflow, got structured
data back, and composed the answer. That composability — an agent
orchestrating another workflow — is the thing n8n specifically does well."

[03:30–04:15] Prompt 3 — memory

Type: "What did I just ask you?"

"The agent remembers the conversation. Window Buffer Memory keeps the
last 5 exchanges. For production you'd swap to Postgres or Redis,
same wiring."

[04:15–05:00] Bridge to Phani

"So to recap: I showed an agent choosing tools inside n8n and orchestrating another workflow. Over to Phani."
```

---

## Gotchas (verified against n8n docs)

| Symptom | Fix |
|---|---|
| "Agent type dropdown is missing" | That's correct. Gone since v1.82. Tools Agent is the only type. |
| `No Session ID found` error from memory | Memory's Session Key must be "Connected Chat Trigger Node" (default). |
| Gemini 401 / "Authorization failed" | Get API key from **aistudio.google.com/apikey** (NOT Google Cloud Console). |
| Gemini `fetch failed` | n8n version too old. Use `n8nio/n8n:latest`. |
| Sub-workflow doesn't appear in Call n8n Workflow Tool's dropdown | First node of the sub-workflow must be **Execute Workflow Trigger**, not Manual Trigger. Save the sub-workflow. |
| Agent writes an answer but never calls a tool | System message isn't forceful enough. ALWAYS in caps helps. |
| Hosted chat URL shows `localhost:5678` | Normal for local dev. Use the Chat button instead of the URL. |

---

## What NOT to do tonight

- **Don't add an HTTP Request tool to an external API** (like arxiv). More failure surface than value for this demo.
- **Keep the demo focused.** Do not add extra tool layers during the live presentation.
- **Don't toggle Public Chat until everything works via the Chat button.**
- **Don't pull an all-nighter.** 5 hours of sleep > a third tool.

---

## Final checklist before sleep

- [ ] n8n running on `localhost:5678`
- [ ] Gemini API key in credentials, verified working
- [ ] Sub-workflow `lookup_meeting_info` saved with Execute Workflow Trigger
- [ ] Main workflow built, all 7 nodes connected at the right ports
- [ ] All 3 test prompts pass via the Chat button
- [ ] Screen recording of a clean run saved as backup
- [ ] Talk script accessible on a second monitor or printed
- [ ] Browser zoomed to 125% for the demo, Logs panel open, notifications silenced

---

## Instructions for the Claude assistant in this window

When I start working with you:

1. **Read this file first.** Don't start suggesting things from scratch.
2. Keep the official n8n docs open for node configuration checks.
3. **Work phase by phase** (Phase 1 → 2 → 3 → 4). Don't skip ahead.
4. **Prefer writing long outputs to files** over pasting into chat. If I ask for the exact workflow JSON, write it to `workflow.json` in this folder.
5. **Don't re-litigate design decisions already made in this doc.** Those are decided. Just help me execute.
6. **If anything doesn't match reality** (n8n UI changed, node name different), check the official n8n docs first, then tell me. Don't guess.

I'm on Ubuntu, using Docker for n8n, using `/home/msi/anaconda3/bin/python` if Python is needed. Let's build.
