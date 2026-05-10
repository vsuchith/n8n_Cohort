# Start Here

This repo is a handoff package for running a 90–120 minute n8n sidecar session with a cohort that already has the chatbot app working.

You do **not** need to read every file. Use the paths below.

---

## Fast Path By Role

### If you are delivering the cohort

Read these first:

1. `00_trainer/TRAINER_README.md`
2. `00_trainer/TRAINER_HANDBOOK.md`
3. `00_trainer/S_P10_BUILD.md`
4. `00_trainer/S_DEMO.md`

Optional before delivery:

- `00_trainer/S_FRAMING.md`
- `00_trainer/S_CHECKPOINTS.md`
- `00_trainer/TRAINER_PITCH.md`

### If you are preparing student material

Share only these with students:

1. `01_student/PREREQS.md`
2. `01_student/STUDENT_WORKFLOW.md`
3. `01_student/CLAUDE.md`
4. `01_student/P10_N8N.md`

Share `01_student/P10_ADVANCED.md` only with students who finish the core flow early.

### If leadership or sponsors ask why this exists

Use:

1. `03_stakeholder/PITCH.md`
2. `03_stakeholder/final_n8n_sidecar_proposal.md`

### If you are debugging or extending

Use:

1. `02_reference/n8n_node_configs.md`
2. `02_reference/n8n_concepts.md`
3. `02_reference/PRODUCTION.md`

### Ignore unless you are reconstructing the original demo

Use `04_demo_archive/` only for historical context.

---

## One-line File Map

| File | One-line purpose |
|---|---|
| `README.md` | Master index for the whole package. |
| `service-setup-checklist.md` | Earlier chatbot service setup checklist that students should already have completed. |
| `START_HERE.md` | Role-based reading guide for cohort teams. |
| `00_trainer/TRAINER_README.md` | Trainer orientation, compact run-of-show, checklist, and common session fixes. |
| `00_trainer/TRAINER_HANDBOOK.md` | Trainer delivery model and explanation of how n8n fits the chatbot product. |
| `00_trainer/TRAINER_PITCH.md` | Spoken opening pitch and trainer Q&A prep. |
| `00_trainer/S_FRAMING.md` | Optional 10-minute script for the sidecar mental model. |
| `00_trainer/S_CHECKPOINTS.md` | Optional precheck script for app readiness and n8n Cloud verification. |
| `00_trainer/S_P10_BUILD.md` | Core 75–90 minute build script for Supabase tickets, Gmail, FastAPI, and React integration. |
| `00_trainer/S_DEMO.md` | Compact 15–20 minute validation and demo format. |
| `01_student/PREREQS.md` | Student pre-session setup for n8n Cloud, LiteLLM, Supabase pooler, and Gmail readiness. |
| `01_student/STUDENT_WORKFLOW.md` | Student checklist for building, wiring, testing, and submitting the sidecar. |
| `01_student/CLAUDE.md` | Updated full drop-in Claude/Copilot instruction file for the chatbot repo plus n8n sidecar. |
| `01_student/P10_N8N.md` | Detailed implementation guide for the core Supabase + Gmail sidecar. |
| `01_student/P10_ADVANCED.md` | Optional advanced router workflow for multiple automation intents. |
| `02_reference/n8n_concepts.md` | Reference guide to n8n concepts, node categories, and mental models. |
| `02_reference/n8n_node_configs.md` | Field-level node configuration reference for the session workflows. |
| `02_reference/PRODUCTION.md` | Production deployment and hardening notes for n8n. |
| `03_stakeholder/PITCH.md` | One-page sponsor/management pitch for the sidecar architecture. |
| `03_stakeholder/final_n8n_sidecar_proposal.md` | Longer proposal with architecture, agenda, and rationale. |
| `04_demo_archive/CONTEXT.md` | Original demo brief and historical context. |
| `04_demo_archive/PHASE5_BUILD.md` | Original demo build notes. |
| `04_demo_archive/START_DEMO.sh` | Original local demo startup helper. |
| `04_demo_archive/notes.md` | Archived demo notes. |
| `04_demo_archive/atg_curriculum.csv` | Archived curriculum data used by the old demo. |
| `04_demo_archive/curriculum_code_node.js` | Archived n8n Code node helper from the old demo. |
| `04_demo_archive/phase1_set_node.json` | Archived n8n node JSON from the old demo. |
| `04_demo_archive/phase2_system_message.txt` | Archived system message from the old demo. |
| `04_demo_archive/2026-Learn With ATG - Curriculum.pdf` | Archived curriculum PDF used by the old demo. |

---

## Recommended Handoff Message

Send this to the cohort delivery team:

> You do not need to read everything. Start with `START_HERE.md`. This is a 90–120 minute sidecar module, not a full-day delivery. Trainers should read the trainer README and build script. Students should receive only `PREREQS.md`, `STUDENT_WORKFLOW.md`, the updated `CLAUDE.md`, and `P10_N8N.md`. Reference and archive folders are optional.
