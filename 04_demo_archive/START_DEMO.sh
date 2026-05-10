#!/bin/bash
# ATG demo startup — run this 30 min before the 11am meeting.
# Assumes: Genera Docker stack is already up (docker compose up -d in ~/Downloads/genera).

set -e

echo "==> Verifying Genera stack is up..."
docker ps --format '{{.Names}}' | grep -qE 'genera-postgres|genera-tei|genera-ollama' || {
  echo "Genera stack not running. Starting..."
  cd ~/Downloads/genera && docker compose up -d
  echo "Waiting 20s for services to be healthy..."
  sleep 20
}

echo "==> Starting n8n (workflows persisted in ~/.n8n)..."
if docker ps --format '{{.Names}}' | grep -q '^n8n$'; then
  echo "n8n already running."
else
  docker run -d --name n8n --rm -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
  echo "Waiting 10s for n8n to be ready..."
  sleep 10
fi

echo "==> Starting Genera MCP server over Streamable HTTP on :8765..."
if ss -tlnp 2>/dev/null | grep -q ':8765'; then
  echo "MCP server already running on 8765."
else
  cd ~/Downloads/genera
  nohup /home/msi/anaconda3/bin/python rag_mcp_sse.py > /tmp/genera_mcp_sse.log 2>&1 &
  echo "MCP server pid=$!"
  sleep 5
fi

echo ""
echo "==> Status check:"
echo "  n8n UI:       http://localhost:5678"
echo "  MCP server:   $(ss -tlnp 2>/dev/null | grep ':8765' && echo OK || echo NOT LISTENING)"
echo "  Genera app:   $(docker ps --format '{{.Status}}' --filter name=genera-app-1 | head -1)"
echo ""
echo "==> Pre-warm recommended. Open n8n, run one test prompt privately:"
echo '    "Find arxiv papers about retrieval-augmented generation with planning"'
echo "   First call is slow (~10s), second is fast (~3s)."
echo ""
echo "==> Good luck tomorrow."
