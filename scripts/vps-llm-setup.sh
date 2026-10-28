#!/usr/bin/env bash
# Bolingo self-hosted tutor LLM — run AS ROOT on the VPS (vps3753677).
# Installs Ollama, pulls qwen2.5:1.5b (the non-reasoning sibling of the
# DeepSeek-R1 1.5B distill — same Qwen2.5-1.5B brain, no thinking tax),
# and exposes it ONLY through a secret nginx path. No external API keys.
#
#   1) Copy this file to the VPS and run:  bash vps-llm-setup.sh
#   2) Copy the three printed values into Supabase secrets:
#        supabase secrets set LLM_BASE_URL=<url> LLM_MODEL=<model> LLM_API_KEY=<token>
#   3) Never publish the printed URL — it IS the password.
set -euo pipefail

TOKEN="$(openssl rand -hex 16)"
SNIPPET=/etc/nginx/snippets/bolingo-llm-location.conf

echo '==> Installing Ollama…'
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo '==> Keeping Ollama warm (model stays loaded 24h)…'
mkdir -p /etc/systemd/system/ollama.service.d
printf '[Service]\nEnvironment="OLLAMA_KEEP_ALIVE=24h"\n' > /etc/systemd/system/ollama.service.d/keepalive.conf
systemctl daemon-reload
systemctl enable --now ollama

echo '==> Pulling qwen2.5:1.5b (~1 GB, one time)…'
ollama pull qwen2.5:1.5b

echo '==> Warming the model once…'
ollama run qwen2.5:1.5b 'Reply with exactly: READY' >/dev/null

echo '==> Wiring secret nginx path (Ollama stays localhost-only)…'
cat > "$SNIPPET" <<EOF
# Bolingo tutor LLM — secret path; this file IS the password. Do not publish.
location /llm-${TOKEN}/ {
  rewrite ^/llm-${TOKEN}/(.*)$ /\$1 break;
  proxy_pass http://127.0.0.1:11434/;
  proxy_read_timeout 120s;
}
EOF
if ! grep -q 'bolingo-llm-location.conf' /etc/nginx/sites-enabled/default 2>/dev/null; then
  # Insert inside the HTTPS server block, right after its server_name line.
  sed -i "0,/server_name bolingo.co.ke;/s//&\n\tinclude snippets\/bolingo-llm-location.conf;/" /etc/nginx/sites-enabled/default
fi
nginx -t && systemctl reload nginx

echo
echo '==> DONE. Set these three Supabase secrets (LLM_API_KEY can be any'
echo '    non-empty value — Ollama ignores it, our edge functions require it):'
echo
echo "    LLM_BASE_URL=https://bolingo.co.ke/llm-${TOKEN}/v1/chat/completions"
echo '    LLM_MODEL=qwen2.5:1.5b'
echo "    LLM_API_KEY=${TOKEN}"
echo
echo '    supabase secrets set LLM_BASE_URL=<url> LLM_MODEL=qwen2.5:1.5b LLM_API_KEY=<token>'
