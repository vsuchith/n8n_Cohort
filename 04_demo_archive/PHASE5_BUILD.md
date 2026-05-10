# Phase 5 — Tier 1 A + B build steps (~45 min total)

Run these AFTER Phases 1-4 are working (you have a working agent + 4 tools).

---

## Tier 1 A — Curriculum lookup sub-workflow (~30 min)

### Step 1 — Create the new sub-workflow (5 min)

1. n8n → Workflows → **Add workflow** → name it `lookup_curriculum`
2. Drop **Execute Workflow Trigger** as the first node
3. In the trigger config, **Workflow Inputs** → Add:
   - **Name:** `query`
   - **Type:** String
   - **Description:** `Search query for ATG curriculum (e.g., Project 13, prompt engineering, advanced)`
4. Save

### Step 2 — Add the Code node (10 min)

5. Click `+` after the Execute Workflow Trigger
6. Search **Code** → pick the **Code** node
7. **Mode:** "Run Once for All Items" (default)
8. **Language:** JavaScript (default)
9. Open `curriculum_code_node.js` in this folder, **copy ALL of its contents**, paste into the Code node's JS editor
10. Click outside the editor to save the node config

### Step 3 — Test the sub-workflow standalone (5 min)

11. In the sub-workflow canvas, click the Execute Workflow Trigger node
12. Click **Execute Step** (top-right of node panel) — choose "Manually" and provide test input:
    ```json
    {"query": "Project 13"}
    ```
13. Click **Execute Step** on the Code node — should return Project 13
14. Try `{"query": "advanced"}` — should return ~11 advanced items
15. Try `{"query": ""}` — should return first 10 items (default browse)
16. Save the workflow (Ctrl+S)

### Step 4 — Wire it into the main workflow (5 min)

17. Open the main `ATG Assignment Assistant` workflow
18. Click `+` on the AI Agent's **Tool** port (same port Wikipedia/Calculator/etc are on)
19. Search **Call n8n Workflow Tool** → pick it
20. Configure:
    - **Name** (what the agent sees): `lookup_curriculum`
    - **Description**: `Use to look up ATG curriculum assignments and projects. Pass a search query (e.g., "Project 13", "Wikipedia", "Advanced", "prompt engineering"). Returns title, level, duration, and URL for matching items.`
    - **Source**: Database
    - **Workflow**: pick `lookup_curriculum` from the dropdown
    - **Workflow Inputs**:
      - Click **Add Input**
      - Name: `query`
      - Value: `={{ $fromAI('query', 'Search term for ATG curriculum lookup', 'string') }}`
21. Save the node

### Step 5 — Update the Agent's system message (3 min)

22. Open the AI Agent node → Options → System Message
23. Find this line:
    ```
    You have access to four tools:
    ```
    Change to:
    ```
    You have access to five tools:
    ```
24. Add this bullet to the tool list (after `genera_rag`):
    ```
    - lookup_curriculum: Use to look up ATG 2026 curriculum assignments
      and projects. Pass a search query like "Project 13",
      "advanced", or "prompt engineering". Returns matching curriculum
      items with title, level, duration, and URL.
    ```
25. Save the workflow (Ctrl+S)

### Step 6 — Test new prompts (5 min)

Open Chat panel, run these in order. **All five must pass.**

| # | Prompt | Expected tool |
|---|---|---|
| 1 | `What is Project 13 in our curriculum?` | `lookup_curriculum` returns the matching project |
| 2 | `Show me all advanced assignments` | `lookup_curriculum` returns ~11 advanced items |
| 3 | `Which assignments are about prompt engineering?` | `lookup_curriculum` returns 2-3 prompt eng items |
| 4 | `What's project 14 and how long does it take?` | `lookup_curriculum` returns "Create agents with N8N, 2 days" |
| 5 | `What did I just ask?` | Memory only, no tool |

If all pass → A is done.

---

## Tier 1 B — Schedule Trigger as visual (~5 min)

This is intentionally minimal. We're adding a Schedule Trigger to the canvas to **show Pattern 2** in the talk track without rewiring the working agent.

### Step 1 — Add Schedule Trigger node (2 min)

1. Open the main `ATG Assignment Assistant` workflow
2. Click somewhere empty on the canvas (away from existing nodes)
3. Click `+` from there → search **Schedule Trigger**
4. Configure:
   - **Trigger Interval**: Days
   - **Trigger At Hour**: 9
   - **Trigger At Minute**: 0

### Step 2 — Connect it to a Set node (placeholder for daily action) (3 min)

5. Click `+` on the Schedule Trigger's output
6. Search **Set** (or **Edit Fields**) → pick it
7. Mode: Manual Mapping → Add field:
   - Name: `daily_action`
   - Value: `Daily ATG digest — would call lookup_curriculum and post results to Slack`
8. Save the workflow

### Done. Don't wire it to anything else.

The visual purpose is to show **two triggers on the same canvas** — one chat-driven (interactive), one schedule-driven (autonomous). You're not actually executing the schedule trigger live; it's there to talk about.

---

## Updated talk track addition (slot in after Prompt 4)

After demoing the existing 4 prompts, add this new **Prompt 5** before bridging to Phani:

```
[After memory check, ~04:00 mark]

"And one more — let me show why I built this in n8n specifically and not
just in code."

Type: "What is Project 13 in our curriculum?"

[Wait for response — should call lookup_curriculum]

"That answer came from a sub-workflow that searches the actual 38-row
ATG curriculum. The agent passed 'Project 13' as a parameter. That's
n8n's composability — sub-workflows are reusable functions any other
workflow or agent can call."

[Point to the Schedule Trigger node on the canvas]

"And see this Schedule Trigger sitting up here? Same agent could fire
on a schedule — every morning at 9am, post the day's relevant
assignments to Slack. Same workflow, different trigger. That's the
automation pattern n8n is built for."

[04:30 — bridge to Phani as before]
```

---

## Final pre-meeting checklist (updated)

- [ ] n8n running on `localhost:5678`
- [ ] OpenAI API key in credentials, verified
- [ ] Sub-workflow `lookup_meeting_info` saved (existing — don't touch)
- [ ] Sub-workflow `lookup_curriculum` saved (new — Tier 1 A)
- [ ] Main workflow has **all 5 tools** (Wikipedia, Calculator, lookup_meeting_info, genera_rag, lookup_curriculum)
- [ ] Schedule Trigger visible on main canvas (Tier 1 B)
- [ ] All 5 test prompts pass via Chat button
- [ ] Pre-warmed Genera (one private call)
- [ ] Screen recording backup saved
- [ ] Browser zoomed 125%, Logs panel open, notifications silenced

---

## What you've now demonstrated (cross-reference to the canonical 5)

| Pattern | How |
|---|---|
| Automation | (mention in Q&A — Form/Webhook trigger as alternative entry) |
| Data pipeline (ETL) | **Schedule Trigger node visible on canvas (Tier 1 B)** |
| AI agent | **Primary demo — agent + 5 tools + memory** |
| Integration glue | **external system call from the workflow** |
| Human-in-the-loop AI | (mention in Q&A — agent could route to Slack approval) |

You now visibly cover 3 of 5 patterns and verbally cover the other 2. That's a complete tour for a 5-7 minute slot.
