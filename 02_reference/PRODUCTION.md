# Production Deployment — hands-on companion

> **Audience:** You've built S1-S5 workflows on a laptop. Now you want to run them on a real server for your team or product.
> **Prerequisite reading:** TRAINER_PITCH.md Section 3 covers the *why* and *what*. This doc is the *how* — with copy-paste commands.
> **Scope:** Self-hosted production on a single VPS. Not n8n Cloud (use their docs for that) and not K8s/multi-region (different scale problem).

---

## 0. Decision tree — which path?

Before reading further, pick the path that matches your constraints:

| Constraint | Recommendation |
|---|---|
| **Just want it running, willing to pay $24+/mo, <5 users** | **n8n Cloud Starter plan.** Sign up at n8n.io/cloud → import workflow JSON → done. Skip this doc. |
| **Team of 5-50, moderate volume, want control** | **This doc — self-hosted on a single VPS** ($20-50/mo DigitalOcean / Hetzner / AWS Lightsail). |
| **Enterprise, compliance requirements, high volume** | **Self-hosted + queue mode + managed Postgres/Redis** on your org's cloud. This doc + Section 7 (queue mode). |
| **Fully air-gapped, no cloud APIs at all** | This doc + swap OpenAI for Ollama per Section 10. |
| **Training / dev environment, not user-facing** | Your laptop is fine. Don't overthink it. |

The rest of this doc assumes the middle case: **self-hosted on a single VPS, moderate volume, team or product usage**.

---

## 1. The target architecture

```
                                ┌──────────────────────────┐
                                │  User / Webhook caller   │
                                └───────────┬──────────────┘
                                            │  HTTPS (443)
                                            ▼
                                ┌──────────────────────────┐
                                │  Caddy (reverse proxy)   │  ← auto HTTPS via Let's Encrypt
                                └───────────┬──────────────┘
                                            │  HTTP :5678
                                            ▼
                                ┌──────────────────────────┐
                                │  n8n container            │
                                │  (single instance)        │
                                └───────────┬──────────────┘
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                ▼                           ▼                           ▼
      ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
      │   Postgres       │      │   Redis          │      │   Qdrant         │
      │   (workflow DB   │      │   (memory, queue │      │   (vector store  │
      │    + chat memory)│      │    if enabled)   │      │    for S4 RAG)   │
      └──────────────────┘      └──────────────────┘      └──────────────────┘
```

Five containers, one `docker-compose.yml`, one VPS.

---

## 2. Server sizing

Pick based on your workflow volume:

| Use | CPU | RAM | Disk | Typical VPS |
|---|---|---|---|---|
| Internal team tool, < 100 executions/day | 2 vCPU | 2 GB | 40 GB SSD | DigitalOcean `s-2vcpu-2gb` ($18/mo), Hetzner CX22 (€7/mo) |
| Product with chatbot, 1k-10k executions/day | 4 vCPU | 8 GB | 80 GB SSD | DO `s-4vcpu-8gb` ($48/mo), Hetzner CX42 (€23/mo) |
| Heavy RAG, 10k+/day, queue mode with workers | 8 vCPU | 16 GB | 160 GB SSD | DO `c-8` ($96/mo), or split into main + workers |

**Disk-heavy workloads** (lots of binary files, attachments, large vector stores): prefer Hetzner or dedicated bare metal for better IOPS/$.

---

## 3. Provision the VPS (20 min)

Example for Hetzner / DigitalOcean Ubuntu 24.04:

```bash
# SSH into the fresh VPS as root
ssh root@<YOUR_VPS_IP>

# Create a non-root user and grant sudo
adduser n8n
usermod -aG sudo n8n

# SSH hardening (optional but recommended)
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
# (make sure your SSH key is in /home/n8n/.ssh/authorized_keys first)
systemctl restart sshd

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker n8n

# Logout and re-login as n8n user
exit
ssh n8n@<YOUR_VPS_IP>
```

---

## 4. Point a domain at the VPS

Buy a domain (Namecheap, Cloudflare, your org's registrar). Create an **A record**:

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `n8n` (or `@` for root) | `<YOUR_VPS_IP>` | 300 |

Verify DNS propagation: `dig n8n.yourdomain.com` should return your VPS IP within 1-10 minutes.

---

## 5. The production docker-compose.yml

On the VPS, as the `n8n` user:

```bash
mkdir ~/n8n-prod && cd ~/n8n-prod
```

Create `docker-compose.yml`:

```yaml
name: n8n-prod

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - n8n

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: unless-stopped
    environment:
      # Domain + protocol
      N8N_HOST: ${N8N_HOST}
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      N8N_EDITOR_BASE_URL: https://${N8N_HOST}/
      WEBHOOK_URL: https://${N8N_HOST}/

      # Encryption — CRITICAL
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}

      # Database
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}

      # Auth for the editor UI
      N8N_USER_MANAGEMENT_JWT_SECRET: ${JWT_SECRET}

      # Timezone
      GENERIC_TIMEZONE: Asia/Kolkata
      TZ: Asia/Kolkata

      # Execution data retention
      EXECUTIONS_DATA_PRUNE: "true"
      EXECUTIONS_DATA_MAX_AGE: "168"    # 7 days
      EXECUTIONS_DATA_PRUNE_MAX_COUNT: "10000"

      # Runners (2.0 default — keep on)
      N8N_RUNNERS_ENABLED: "true"

      # Community nodes (if you plan to install any)
      N8N_COMMUNITY_PACKAGES_ENABLED: "true"

    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:v1.17.0
    restart: unless-stopped
    environment:
      QDRANT__SERVICE__API_KEY: ${QDRANT_API_KEY}
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  n8n_data:
  postgres_data:
  redis_data:
  qdrant_data:
  caddy_data:
  caddy_config:
```

Create `.env` in the same folder:

```bash
# Replace the domain
N8N_HOST=n8n.yourdomain.com

# Generate secrets (run these commands once, paste the output here)
# openssl rand -hex 32
N8N_ENCRYPTION_KEY=<PASTE_OPENSSL_RAND_HEX_32>
JWT_SECRET=<PASTE_OPENSSL_RAND_HEX_32>
POSTGRES_PASSWORD=<PASTE_OPENSSL_RAND_BASE64_24>
REDIS_PASSWORD=<PASTE_OPENSSL_RAND_BASE64_24>
QDRANT_API_KEY=<PASTE_OPENSSL_RAND_BASE64_24>
```

Generate the secrets:

```bash
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" >> .env
echo "REDIS_PASSWORD=$(openssl rand -base64 24)" >> .env
echo "QDRANT_API_KEY=$(openssl rand -base64 24)" >> .env
```

Create `Caddyfile`:

```
{$N8N_HOST} {
    reverse_proxy n8n:5678
    encode gzip
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

**⚠️ Critical — permissions and secrets:**

```bash
chmod 600 .env
```

The `.env` must NEVER be committed to git. Add to `.gitignore` if you put this folder under version control.

---

## 6. Launch it

```bash
cd ~/n8n-prod
docker compose up -d

# Watch logs until n8n is ready
docker compose logs -f n8n
# Wait for: "Editor is now accessible via: https://n8n.yourdomain.com/"
# Ctrl+C to exit log view; containers keep running in background
```

Open `https://n8n.yourdomain.com` in a browser. You'll get the first-time setup screen:
- Create the owner account (email + strong password)
- Skip optional telemetry prompts

Caddy automatically provisions the TLS cert via Let's Encrypt on first request. Takes ~30 seconds.

---

## 7. Migrate your workflows from laptop to production

### 7.1 Export workflows from your laptop's n8n

On your laptop:
1. Open each workflow (S1, S2, S3 — skip S4/S5 for now if you haven't built them).
2. Top-right three-dot menu → **Download** → save each as `s1.json`, `s2.json`, etc.
3. Same for `lookup_meeting_info` if you built it in the demo.

### 7.2 Recreate credentials in production n8n

Credentials **do not transfer via JSON export** (on purpose — they're encrypted with the source instance's key). You'll recreate them:

- **OpenAi account** — same API key from PREREQS Part 3.
- **Google OAuth** — create a new OAuth client in Google Cloud Console with the production redirect URI: `https://n8n.yourdomain.com/rest/oauth2-credential/callback` — then configure in n8n with the new Client ID + Secret.
- **Any other service credentials** — rebuild with the same keys.

### 7.3 Import the workflows

- In production n8n → top-left → Workflows → click the **+** → **Import from File** → pick `s1.json`.
- n8n imports the workflow. It will complain about missing credentials — open each credential-using node, pick the newly-created production credential from the dropdown.
- **Test by hand once**: send a test email (S1), trigger manually (S2, S3).
- **Publish** the workflow.

Repeat for each workflow.

---

## 8. The 7 production swaps (what to change in your workflows)

The classroom workflows used dev-grade components. In production, swap each:

### Swap 1: SQLite → Postgres (already done via env vars)

Your `docker-compose.yml` sets `DB_TYPE=postgresdb`. n8n auto-creates tables on first run. No workflow changes needed.

### Swap 2: Simple Memory → Postgres Chat Memory (S3, S4, S5)

**Why:** Simple Memory is in-process RAM — lost on container restart, doesn't scale across workers.

**How:**
1. Open each workflow with a Simple Memory sub-node.
2. Delete the Simple Memory sub-node.
3. Click + on the AI Agent's Memory port → search **"Postgres Chat Memory"** → pick it.
4. Create a new credential: Postgres → Host=`postgres`, Port=5432, DB=`n8n`, User=`n8n`, Password=`{POSTGRES_PASSWORD}` (from your .env) — same Postgres that n8n uses for itself, table name `n8n_chat_histories`.
5. Session Key: `Connected Chat Trigger Node` (default — same as Simple Memory).
6. Context Window Length: `20` (higher than classroom's 10 — Postgres can handle it).
7. Republish the workflow.

Now memory persists across restarts and works with multiple instances.

### Swap 3: Simple Vector Store → Qdrant (S4)

**Why:** Simple Vector Store is in-memory, lost on restart, can't handle millions of chunks.

**How:**

**In S4's ingestion workflow (`s4a_ingest`):**
1. Delete the Simple Vector Store node.
2. Add **Qdrant Vector Store** in "Insert Documents" mode.
3. Create Qdrant credential: URL=`http://qdrant:6333`, API Key=`{QDRANT_API_KEY}`.
4. Collection Name: `training_docs` (create it manually first via Qdrant API, or use the "Create collection if not exists" option).
5. Keep the same Embeddings OpenAI sub-node + Data Loader + Splitter.
6. Re-run ingestion — chunks now live in Qdrant, durable across restarts.

**In S4's query workflow (`s4b_query`):**
1. Delete the Simple Vector Store tool.
2. Add **Qdrant Vector Store** in "Retrieve Documents (As Tool for AI Agent)" mode.
3. Same credential + collection name.
4. Same Embeddings OpenAI sub-node (must match ingestion).
5. Republish.

### Swap 4: Unencrypted credentials → N8N_ENCRYPTION_KEY (already done)

Your `.env` set `N8N_ENCRYPTION_KEY`. All credentials saved in n8n are now encrypted at rest in Postgres. **Never lose this key** — it's required to decrypt existing credentials. Back it up to a password manager.

### Swap 5: Manual testing → Webhook for real triggers

For workflows that were triggered via the Chat button in class (S3, S4, S5), decide the real entrypoint:
- **Public chat**: Chat Trigger → "Make Chat Publicly Available" → ON. Gives you `https://n8n.yourdomain.com/chat/<workflow-id>`.
- **Embedded widget**: use the `@n8n/chat` npm package in your frontend, point at the Chat Trigger's URL.
- **Slack / Teams**: Webhook Trigger + Slack's slash-command configuration.

### Swap 6: No error handling → Error Trigger workflow

Create ONE new workflow in production:

1. **+ Add workflow** → name it `error_handler`.
2. First node: **Error Trigger**. It fires when ANY other workflow in this instance fails.
3. Add a **Slack** node (or Gmail if no Slack): send a message to your on-call channel with:
   - Subject: `n8n failure: {{ $json.workflow.name }}`
   - Body: `Execution ID: {{ $json.execution.id }}\nNode: {{ $json.execution.error.node.name }}\nError: {{ $json.execution.error.message }}\nURL: https://n8n.yourdomain.com/workflow/{{ $json.workflow.id }}/executions/{{ $json.execution.id }}`
4. Save + Publish.

Now any workflow failure → instant Slack alert with a clickable link to the broken execution. Set it up **once** and it covers everything.

### Swap 7: No observability → Langfuse

Langfuse traces every LLM call: input, output, tokens, cost, latency. Critical for AI production.

**Add Langfuse container to docker-compose.yml:**

```yaml
  langfuse:
    image: langfuse/langfuse:latest
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://n8n:${POSTGRES_PASSWORD}@postgres:5432/langfuse
      NEXTAUTH_SECRET: ${JWT_SECRET}
      SALT: ${LANGFUSE_SALT}
      NEXTAUTH_URL: https://langfuse.yourdomain.com
    depends_on:
      - postgres
```

Add a second Caddy block for `langfuse.yourdomain.com`. Create a Postgres database for Langfuse: `docker compose exec postgres psql -U n8n -c "CREATE DATABASE langfuse;"`.

**In each n8n AI workflow**, add Langfuse tracing by wrapping the OpenAI Chat Model with a Langfuse wrapper (n8n has native support as of 2.x). Configure the Langfuse credential in n8n with your project keys.

From then on, every LLM call shows up in Langfuse with full traces.

---

## 9. Publish/Save lifecycle + version control

### The Publish/Save model (n8n 2.0)

- **Save** = autosave draft, not live.
- **Publish** = promotes draft to the active production version.
- **Unpublish** = takes the workflow offline; triggers stop firing.
- **Version history** — Settings → top-right `↻` icon → rollback to any previous published version.

Rule: **never edit directly on production**. Test changes locally, export JSON, import to production, publish. Or use:

### Git-backed workflows (recommended)

1. On your laptop, maintain a folder `n8n-workflows/` with the JSON exports under version control.
2. Every workflow change: export → commit to git → push.
3. Deploy to production via the n8n API (see Section 12).
4. PRs become the change-review mechanism.

Example workflow file structure:

```
n8n-workflows/
├── s1_email_auto_responder.json
├── s2_daily_meeting_brief.json
├── s3_personal_task_agent.json
├── s4a_ingest.json
├── s4b_query.json
├── s5_research_assistant.json
├── error_handler.json
└── README.md
```

---

## 10. Cost optimization

### OpenAI cost tracking

- In Langfuse: every trace shows token counts and USD cost.
- In OpenAI dashboard: set a **Usage Limit** + **Alert Threshold** at $X per month. Hard stop prevents runaway costs.

### Swap OpenAI for Ollama (private data + zero per-query cost)

For workflows handling sensitive internal data (HR policies, customer support tickets), run everything on-prem:

Add to `docker-compose.yml`:

```yaml
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    volumes:
      - ollama_data:/root/.ollama
    # Optional: expose for GPU - deploy section with nvidia runtime
```

Pull models: `docker compose exec ollama ollama pull llama3.2:3b` (1.9GB, runs fast on CPU).

In n8n workflows, swap **OpenAI Chat Model** → **Ollama Chat Model** (Base URL: `http://ollama:11434`, Model: `llama3.2:3b`).

Caveats:
- Small local models (3-7B) are worse at tool-calling than `gpt-4o-mini`. Test thoroughly.
- CPU inference is slow (~5-15 seconds per turn). GPU dramatically faster.
- Consider a **hybrid**: routing on OpenAI (quality), execution on Ollama (cost/privacy).

---

## 11. Backups

### Daily Postgres dump + offsite

Add to root crontab (`sudo crontab -e`):

```cron
0 2 * * * docker exec n8n-prod-postgres-1 pg_dump -U n8n n8n | gzip > /home/n8n/backups/n8n-$(date +\%F).sql.gz && find /home/n8n/backups -name "n8n-*.sql.gz" -mtime +30 -delete
```

Daily dump at 2 AM, 30-day rolling retention locally.

**Offsite**: add an `rclone` step to upload to S3, Backblaze B2, or Hetzner Storage Box. Never rely solely on local backups.

### What to back up besides Postgres

- **`.env`** (contains N8N_ENCRYPTION_KEY — without it, backed-up credentials are useless)
- **`/var/lib/docker/volumes/n8n-prod_n8n_data/`** (n8n's working directory — has cached settings)
- **Qdrant volume** (if using RAG — re-ingesting is painful)

Restore drill: practice it **once** on a test VPS before you need it in an emergency.

---

## 12. CI/CD — deploy workflows from git

n8n's API lets you push workflow JSON from a CI pipeline.

### Generate an API key

In production n8n → Settings → n8n API → **Create an API key** → copy + store in a secret manager.

### Deploy script (example)

```bash
#!/bin/bash
# deploy-workflow.sh
set -e

N8N_URL="https://n8n.yourdomain.com"
N8N_API_KEY="$N8N_API_KEY"   # from your CI secrets

WORKFLOW_FILE="$1"
WORKFLOW_ID=$(jq -r '.id' "$WORKFLOW_FILE")

# Update the workflow
curl -X PUT "$N8N_URL/api/v1/workflows/$WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @"$WORKFLOW_FILE"

# Publish it
curl -X POST "$N8N_URL/api/v1/workflows/$WORKFLOW_ID/activate" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

GitHub Actions example:

```yaml
name: Deploy n8n workflows
on:
  push:
    branches: [main]
    paths: ['n8n-workflows/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy changed workflows
        env:
          N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
        run: |
          for f in $(git diff --name-only HEAD~1 -- 'n8n-workflows/*.json'); do
            ./deploy-workflow.sh "$f"
          done
```

Now every PR merge auto-deploys changed workflows. No more manual export/import dance.

---

## 13. Security checklist

Tick every box before pointing real users at this:

- [ ] `N8N_ENCRYPTION_KEY` set in `.env` and backed up to password manager
- [ ] `.env` has `chmod 600` and is in `.gitignore`
- [ ] HTTPS enforced via Caddy (no HTTP leak)
- [ ] Editor UI protected by n8n user account (not anonymous)
- [ ] API key rotated on a schedule (or revoked when team members leave)
- [ ] Webhook triggers have auth (Basic, Header, or JWT)
- [ ] OAuth client secrets (Google, etc.) stored only in n8n credentials, never in prompts/descriptions
- [ ] OpenAI API key has a monthly spend cap
- [ ] SSH hardened: no password auth, no root login, non-standard port optional
- [ ] UFW firewall: only 22/80/443 open externally
- [ ] Postgres + Redis + Qdrant NOT exposed externally (only accessible inside Docker network)
- [ ] Langfuse (if installed) has its own auth, not shared with n8n users
- [ ] Backups tested by restoring to a staging VPS once
- [ ] Error Trigger workflow live → alerts on every failure
- [ ] Rate limiting on public endpoints (via Caddy or a CDN like Cloudflare)
- [ ] Content filter on LLM outputs for PII/compliance if workflows touch customer data

---

## 14. Pre-launch smoke test

Before pointing real traffic:

```bash
# From your laptop
curl -I https://n8n.yourdomain.com
# Expect: HTTP/2 200, valid TLS cert

# Open n8n UI, run each workflow's test prompt:
# S1: send yourself a test email
# S2: right-click Schedule Trigger → Execute step
# S3: chat: "Add 'smoke test' to my list"
# S4a: execute ingestion manually
# S4b: chat: "What topics are in my docs?"
# S5: chat: "Research RAG and save a note"

# Verify each in the expected downstream:
# S1: draft in Gmail Drafts
# S2: brief email in your inbox
# S3: row in Sheet
# S4b: citations with real filenames
# S5: row in Research Notes

# Then intentionally break one — kill a credential, confirm Error Trigger fires → Slack alert arrives
```

If all green → you're live.

---

## 15. Operating it — daily/weekly/monthly cadence

| Frequency | Action |
|---|---|
| Daily (automated) | Postgres backup runs via cron |
| Daily (2 min check) | Glance at Langfuse — any anomalous token spikes? |
| Weekly (10 min) | Review n8n Executions tab — any failed runs not caught by Error Trigger? |
| Weekly | Check OpenAI billing dashboard for cost trend |
| Monthly | `docker compose pull && docker compose up -d` (update n8n, Postgres, Qdrant) — read release notes first |
| Monthly | Rotate `N8N_ENCRYPTION_KEY`? No — it's a one-time value. Rotate API keys (OpenAI, Google OAuth) per your org's policy. |
| Quarterly | Restore-drill: restore backup to a staging VPS, confirm workflows run. |
| Quarterly | Review security checklist — anything drifted? |

---

## 16. When to go beyond a single VPS

Single-VPS self-hosting scales to ~10-20k executions/day before you hit limits. Move to **queue mode** when:

- Executions queue backs up regularly (single instance can't keep up)
- LLM latency makes users wait
- You need multi-region failover

Queue mode = 1 main n8n + N workers + Redis as the queue. See TRAINER_PITCH Section 3.2 Stage 4 for the setup. Not covered in this doc — it's a different architecture.

---

## 17. Troubleshooting in production

| Symptom | Fix |
|---|---|
| Workflows import but fail on execute with "credential not found" | You didn't recreate the credentials after importing. Open each node, pick a production credential. |
| OAuth redirect works locally but fails in production | Your Google Cloud OAuth client's authorized redirect URI still points at `localhost:5678`. Add `https://n8n.yourdomain.com/rest/oauth2-credential/callback` to the authorized redirect URIs in Google Cloud Console. |
| TLS cert fails to provision | DNS hasn't propagated, or port 80 is blocked. Check `dig n8n.yourdomain.com` and `ufw status`. |
| Postgres memory climbs unboundedly | `EXECUTIONS_DATA_PRUNE=true` isn't working → check n8n logs for errors. Manually vacuum: `docker compose exec postgres psql -U n8n -c "VACUUM FULL;"`. |
| Qdrant returns no chunks after restart | Qdrant volume not persisted. Check `docker volume ls` — `n8n-prod_qdrant_data` should exist. Re-run ingestion if empty. |
| Langfuse shows 0 traces | Langfuse credential not configured on the OpenAI Chat Model, or wrong keys. |
| n8n container keeps restarting | `docker compose logs n8n | tail -50` — usually a DB connection issue or missing env var. |

---

## 18. What this doc doesn't cover (deliberately)

- **Kubernetes** — if you need it, n8n has a [Helm chart](https://docs.n8n.io/hosting/installation/server-setups/kubernetes/).
- **Multi-region HA** — requires clustered Postgres + Redis + queue mode. Different doc.
- **n8n Cloud** — use their docs + customer support.
- **Air-gapped enterprise with no external APIs** — doable with Ollama and local services, but every session needs rework. Separate project.
- **Migrating from Zapier / Make** — different workflows, different patterns, different mental model. Out of scope.

---

## Summary — what you now have

After following this doc:

- n8n running at `https://n8n.yourdomain.com` with HTTPS
- Postgres for workflow storage + chat memory
- Redis for caching and (future) queue mode
- Qdrant for persistent vector storage (S4 RAG)
- Caddy auto-handling TLS
- Daily automated Postgres backups
- Error Trigger workflow alerting on failures
- Langfuse tracing every LLM call
- Git-backed workflow deployment via API
- Full security checklist completed

Total monthly cost for a team-scale deployment: **~$25-50 VPS + $5-20 OpenAI** = under $70/month, covering thousands of executions with observability, backups, and real-user-ready uptime.

That's production-grade n8n on a laptop-budget.
