# ATG n8n Training — Master Index

This repository contains everything for the **n8n sidecar integration module**: a compact 90–120 minute trainer package, student implementation workflow, reference materials, stakeholder pitch documents, and the original archived demo.

Two flows. Everything mapped below.

---

## Folder structure

```
atg-n8n-demo/
│
├── README.md                           ← you are here
├── START_HERE.md                       quick role-based reading guide for cohort handoff
├── service-setup-checklist.md          earlier chatbot service setup checklist
│
├── 00_trainer/                         ── TRAINER FLOW ──────────────────────
│   ├── TRAINER_README.md               start here — orientation & run-of-show
│   ├── TRAINER_HANDBOOK.md             trainer handbook — delivery model and student workflow
│   ├── TRAINER_PITCH.md                10-min opening pitch script + Q&A prep
│   ├── S_FRAMING.md                    optional 10-min sidecar mental model
│   ├── S_CHECKPOINTS.md                optional precheck script — app readiness and n8n verify
│   ├── S_P10_BUILD.md                  core 75–90 min n8n sidecar build + app wiring
│   └── S_DEMO.md                       compact 15–20 min validation + demo
│
├── 01_student/                         ── STUDENT FLOW ──────────────────────
│   ├── PREREQS.md                      pre-session: n8n Cloud + credential setup
│   ├── CLAUDE.md                       updated drop-in Claude/Copilot instructions for the chatbot + n8n sidecar
│   ├── STUDENT_WORKFLOW.md             student checklist — build, integrate, test, submit
│   ├── P10_N8N.md                      core: Supabase tickets + Gmail notifications (bi-directional)
│   └── P10_ADVANCED.md                 advanced: Intent Router — Switch node, multiple sub-workflows
│
├── 02_reference/                       ── SHARED REFERENCE ──────────────────
│   ├── n8n_concepts.md                 comprehensive n8n node catalog (triggers, flow, AI cluster, tools)
│   ├── n8n_node_configs.md             field-level configuration reference for all session nodes
│   ├── PRODUCTION.md                   self-hosted production deployment (post-training path)
│
├── 03_stakeholder/                     ── PITCH & PROPOSAL ──────────────────
│   ├── PITCH.md                        management brief — "the chatbot can now act"
│   └── final_n8n_sidecar_proposal.md   executive proposal — why n8n, why sidecar, architecture
│
└── 04_demo_archive/                    ── ORIGINAL DEMO (2026-04-24) ────────
    ├── CONTEXT.md                      demo brief — ATG Assignment Assistant build guide
    ├── PHASE5_BUILD.md                 Tier 1A/B build steps (curriculum lookup + schedule trigger)
    ├── START_DEMO.sh                   docker startup script for local n8n
    ├── notes.md                        docker run command anatomy (teaching reference)
    ├── curriculum_code_node.js         Code node JS — curriculum search sub-workflow
    ├── atg_curriculum.csv              ATG curriculum data used by the demo
    ├── phase1_set_node.json            Set node JSON config (Phase 1 demo artifact)
    ├── phase2_system_message.txt       Agent system message (Phase 2 demo artifact)
    └── 2026-Learn With ATG - Curriculum.pdf   the full ATG curriculum PDF
```

---

## Flow 1 — Trainer readiness

Everything a trainer needs to deliver the n8n sidecar integration in 90–120 minutes.

### Before the session

| Step | File | What it is |
|---|---|---|
| 1 | [PREREQS.md](01_student/PREREQS.md) | Send this to students before the session. They create their n8n Cloud account and verify credentials. |
| 2 | [TRAINER_HANDBOOK.md](00_trainer/TRAINER_HANDBOOK.md) | Read this before delivery. It explains the proposed trainer flow and student workflow. |
| 3 | [TRAINER_README.md](00_trainer/TRAINER_README.md) | Use this as the detailed run-of-show and pre-session checklist. |

### Compact Session Delivery

| Segment | Duration | File | Purpose |
|---|---|---|---|
| Frame | 5–10 min | [S_FRAMING.md](00_trainer/S_FRAMING.md) | Sidecar pattern, boundaries, and what students are building. |
| Verify | 10–15 min | [S_CHECKPOINTS.md](00_trainer/S_CHECKPOINTS.md) | Quick check that n8n, LiteLLM, Supabase, and Gmail readiness are acceptable. |
| Build | 60–75 min | [S_P10_BUILD.md](00_trainer/S_P10_BUILD.md) | Build the core n8n workflow and wire FastAPI/React. |
| Validate | 15–20 min | [S_DEMO.md](00_trainer/S_DEMO.md) | End-to-end ticket creation test and normal-chat regression check. |

### Post-session reference (share with students after demo)

| File | What it is |
|---|---|
| [PRODUCTION.md](02_reference/PRODUCTION.md) | Complete self-hosted n8n production guide: Docker Compose, Caddy HTTPS, Postgres, Redis, Qdrant, Langfuse, CI/CD, backups, security checklist. The "what comes next" story. |

---

## Flow 2 — Student implementation

Everything a student needs to add the n8n sidecar continuation independently — with or without an AI coding agent.

### Before the session

| File | When | What it is |
|---|---|---|
| [PREREQS.md](01_student/PREREQS.md) | Before the session | Reuse the earlier service setup, create n8n Cloud account, save LiteLLM + Supabase PostgreSQL credentials, and run the LiteLLM verify workflow. ~15–25 minutes. |
| [CLAUDE.md](01_student/CLAUDE.md) | Given at implementation time | Updated drop-in coding-agent instruction file. Use this as the revised `CLAUDE.md` for `ai-forge-chatbot/amzur-ai-chat`. |
| [STUDENT_WORKFLOW.md](01_student/STUDENT_WORKFLOW.md) | Given at implementation time | Human-readable checklist for building the n8n workflow, integrating FastAPI/React, testing, and submitting evidence. |

### Implementation

| File | When | What it is |
|---|---|---|
| [P10_N8N.md](01_student/P10_N8N.md) | Given during build | Core implementation: Supabase tickets table, n8n 6-node workflow (Webhook → Normalize → AI Agent + Structured Output → PostgreSQL → Gmail → Respond), FastAPI and React code, bi-directional status update, acceptance criteria. |
| [P10_ADVANCED.md](01_student/P10_ADVANCED.md) | After core is working | Advanced module: Intent Router — one webhook, Switch node routes "ticket" / "meeting" / "digest" to separate sub-workflows. Google Calendar booking + open-ticket email digest included. |

**How to use the n8n instructions with an AI agent:**
> Use [CLAUDE.md](01_student/CLAUDE.md) as the revised full instruction file for `ai-forge-chatbot/amzur-ai-chat`. Use [P10_N8N.md](01_student/P10_N8N.md) only when the agent or student needs detailed copy-paste implementation steps. Parts 0–2 (Supabase migration and n8n workflows) must be done manually in the browser.

**Recommended student path:**
> Use [STUDENT_WORKFLOW.md](01_student/STUDENT_WORKFLOW.md) as the checklist. Use [CLAUDE.md](01_student/CLAUDE.md) as the updated coding-agent instruction file. Use [P10_N8N.md](01_student/P10_N8N.md) when a student needs detailed copy-paste implementation reference. Give [P10_ADVANCED.md](01_student/P10_ADVANCED.md) only to students who finish core early.

### Reference (available throughout)

| File | What it is |
|---|---|
| [n8n_concepts.md](02_reference/n8n_concepts.md) | Comprehensive n8n reference: all 8 trigger types, flow-control nodes, full AI cluster (chains, agents, memory, vector stores, embeddings, output parsers), all tool categories, data flow model, canonical patterns cheat sheet. Use during and after sessions. |
| [n8n_node_configs.md](02_reference/n8n_node_configs.md) | Field-level configuration reference for every node used across the 5 sessions: what goes in each box, typical values, gotchas. The "what do I type here" companion to n8n_concepts.md. |

---

## Stakeholder / pitch documents

Used to introduce the n8n sidecar approach to management, sponsors, or new team members.

| File | Audience | What it is |
|---|---|---|
| [PITCH.md](03_stakeholder/PITCH.md) | Management, project sponsors | 1-page brief. Story: the existing chatbot understands the business; n8n lets it act on business requests. Architecture, demo scenario, two-AI-layer explanation. |
| [final_n8n_sidecar_proposal.md](03_stakeholder/final_n8n_sidecar_proposal.md) | Project stakeholders | Executive proposal. Why n8n as sidecar, full architecture rationale, comparison of what the app owns vs what n8n owns, production path, demo story. |

---

## Original demo artifacts (2026-04-24)

The demo that preceded the training program. Built the "ATG Assignment Assistant" — an n8n chat agent that answers questions, does calculations, remembers context, and calls a sub-workflow to look up meeting data. Used to pitch n8n to the ATG team.

| File | What it is |
|---|---|
| [CONTEXT.md](04_demo_archive/CONTEXT.md) | Full demo brief: situation, architecture, build phases, 5-minute talk script, gotchas, pre-meeting checklist. The complete build guide for the original demo. |
| [PHASE5_BUILD.md](04_demo_archive/PHASE5_BUILD.md) | Tier 1A: curriculum lookup sub-workflow (Code node + Call n8n Workflow Tool). Tier 1B: Schedule Trigger on canvas for visual pattern demo. Updated talk track and checklist. |
| [START_DEMO.sh](START_DEMO.sh) | Docker command to start n8n locally for the demo. |
| [notes.md](notes.md) | Docker run command anatomy — explains every flag. Teaching reference for explaining Docker to engineers. |
| [curriculum_code_node.js](curriculum_code_node.js) | JavaScript for the Code node in the `lookup_curriculum` sub-workflow. Searches the ATG curriculum CSV. |
| [atg_curriculum.csv](atg_curriculum.csv) | The 38-row ATG curriculum data used by the demo's lookup tool. |
| [phase1_set_node.json](phase1_set_node.json) | Set node JSON config from Phase 1 of the demo (meeting data). |
| [phase2_system_message.txt](phase2_system_message.txt) | Agent system message from Phase 2 of the demo. |
| [2026-Learn With ATG - Curriculum.pdf](2026-Learn With ATG - Curriculum.pdf) | Full ATG curriculum PDF. |

---

## Document relationship map

```
                    ┌─────────────────────────────┐
                    │  ORIGINAL DEMO (Apr 2026)   │
                    │  CONTEXT.md + PHASE5_BUILD  │
                    │  The proof of concept that  │
                    │  justified the sidecar track │
                    └──────────────┬──────────────┘
                                   │ informed
                    ┌──────────────▼──────────────┐
                    │  STAKEHOLDER PITCH          │
                    │  PITCH.md                   │
                    │  final_n8n_sidecar_proposal │
                    └──────────────┬──────────────┘
                                   │ approved → training built
           ┌───────────────────────┴─────────────────────────┐
           │                                                  │
┌──────────▼──────────┐                         ┌────────────▼────────────┐
│   TRAINER FLOW      │                         │   STUDENT FLOW          │
│                     │                         │                         │
│ TRAINER_HANDBOOK    │  gives to students ──►  │ PREREQS.md              │
│ TRAINER_README      │                         │ STUDENT_WORKFLOW.md     │
│ TRAINER_PITCH       │                         │ CLAUDE.md               │
│ S_FRAMING           │  shares at build  ───►  │   └─ give to Claude /   │
│ S_CHECKPOINTS       │                         │      Copilot to impl.   │
│ S_P10_BUILD         │                         └────────────┬────────────┘
│ S_DEMO              │                                      │ during / after
└─────────────────────┘                         │   REFERENCE             │
                                                │ n8n_concepts.md         │
                                                │ n8n_node_configs.md     │
                                                │ PRODUCTION.md           │
                                                └─────────────────────────┘
```

---

## Quick reference: which file answers which question

| Question | File |
|---|---|
| What is n8n and why are we using it? | [TRAINER_PITCH.md](00_trainer/TRAINER_PITCH.md) Section 1 + [PITCH.md](03_stakeholder/PITCH.md) |
| What does the trainer do today, in what order? | [TRAINER_README.md](00_trainer/TRAINER_README.md) |
| How do students set up n8n before the session? | [PREREQS.md](01_student/PREREQS.md) |
| What is the sidecar pattern and why two AI layers? | [S_FRAMING.md](00_trainer/S_FRAMING.md) + [PITCH.md](03_stakeholder/PITCH.md) |
| How do I verify the app is ready before n8n? | [S_CHECKPOINTS.md](00_trainer/S_CHECKPOINTS.md) |
| How do I build the 6-node n8n workflow? | [S_P10_BUILD.md](00_trainer/S_P10_BUILD.md) Part 2 + [P10_N8N.md](01_student/P10_N8N.md) Part 2 |
| What should I give Claude/Copilot for the n8n continuation? | [CLAUDE.md](01_student/CLAUDE.md), the updated full instruction file |
| What checklist should students follow? | [STUDENT_WORKFLOW.md](01_student/STUDENT_WORKFLOW.md) |
| What FastAPI and React code do I write for the sidecar? | [P10_N8N.md](01_student/P10_N8N.md) Parts 3–4 |
| How is the Supabase + Gmail workflow built? | [P10_N8N.md](01_student/P10_N8N.md) Parts 0–2 |
| How do I add multiple automation intents (meeting, digest)? | [P10_ADVANCED.md](01_student/P10_ADVANCED.md) |
| What are the integration tests and demo format? | [S_DEMO.md](00_trainer/S_DEMO.md) |
| What does production n8n look like? | [PRODUCTION.md](02_reference/PRODUCTION.md) |
| What is `$fromAI()` and how does it work? | [n8n_concepts.md](02_reference/n8n_concepts.md) Part 4 + [n8n_node_configs.md](02_reference/n8n_node_configs.md) |
| What was the original 2026-04-24 demo? | [CONTEXT.md](04_demo_archive/CONTEXT.md) |
