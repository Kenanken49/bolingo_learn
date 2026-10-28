# Self-hosted tutor LLM (no external keys)

All three learner-facing AI paths — **Ask Bingo** (`ask-bingo`), **Explain My
Answer** (`explain-answer`), **Roleplay** (`roleplay-chat`) — speak plain
OpenAI-compatible `/v1/chat/completions`. Pointing them at our own model
needs **zero code changes**: only the three Supabase secrets change.

## Why not DeepSeek-R1 directly

R1 is a *reasoning* model: it must "think" (hundreds of tokens) before every
answer. Measured on a real PC (Oct 2026):

- `deepseek-r1:1.5b` — ~56 s per short answer, **and hallucinated** basic
  Spanish grammar ("hablable is for native speakers…"). Wrong + slow.
- `deepseek-r1:7b` — **4.5+ min** per answer on CPU. Unusable interactively.

Cutting the wait while staying in the same family means using R1-1.5B's
non-reasoning sibling: **`qwen2.5:1.5b`** (the R1-1.5B distill is built on
Qwen2.5-1.5B — same brain, no thinking tax). It answers directly in seconds
on CPU, and our edge functions already strip any `<think>` leakage and fall
back to `reasoning` fields (`cleanModelText`), so either model shape is safe.

## Architecture

```
learner → Supabase edge fn → https://bolingo.co.ke/llm-<secret>/v1/…
                              └─ nginx ──► 127.0.0.1:11434 (Ollama, VPS-local)
```

- Ollama **never leaves localhost**; the only public surface is the secret
  path, which acts as the password. `LLM_API_KEY` is then just a local gate
  token, not a paid third-party key.
- If the VPS is ever unreachable, the app's Ask Bingo sheet falls back to
  the offline 📖 Kamusi — learners are never stranded.

## Runbook

1. On the VPS as root: copy `scripts/vps-llm-setup.sh`, run
   `bash vps-llm-setup.sh`, keep the three printed values private.
2. From your dev machine (Supabase CLI already linked):
   `supabase secrets set LLM_BASE_URL=<url> LLM_MODEL=qwen2.5:1.5b LLM_API_KEY=<token>`
3. Live-test: invoke `ask-bingo` with a real question; expect a 2–4 sentence
   hint in seconds, no `reasoning`/`think` text in the reply.

## Live status (Oct 28, 2026)

Secrets point at the VPS model. Measured through production:
ask-bingo ~15 s (cold), explain-answer ~10 s, clean `content`, no
`<think>` leakage. First call after idle is slowest (model load + TLS).

Known quality ceiling at 1.5B: hints land in the right neighborhood but
wobble on terminology (e.g. correctly guides hablé→past, but may fumble
the tense name; explains she→watches agreement, but may echo the answer
tautologically). Acceptable for hints, not exam-grade. Upgrade path when
budget allows: `ollama pull` a larger model on the VPS (e.g. qwen2.5:7b
needs ~8 GB RAM — check `free -m` first) and swap only `LLM_MODEL`.

## Failover (Nov 2026)

All three functions now try the VPS first (50 s timeout) and, only on
failure/timeout/empty answer, retry once against optional hosted secrets:

```bash
supabase secrets set LLM_FALLBACK_URL=https://api.groq.com/openai/v1/chat/completions \
  LLM_FALLBACK_KEY=<groq-key> LLM_FALLBACK_MODEL=openai/gpt-oss-120b
```

Note (Oct 28, 2026): Groq retired the `llama-3.3-70b-versatile` and
`llama-3.1-8b-instant` IDs (both 404 `model_not_found`).
`openai/gpt-oss-120b` is the verified live ID — a 120B open model that
answered the hablé/hablo grammar question perfectly in 1.6 s direct,
2.0 s through edge-failover (`via: fallback`, warm tone, correct
preterite-vs-present teaching). If Groq retires IDs again, probe
candidates directly (`model_not_found` = dead) before touching secrets.

Fallback unset = primary-only (today's behavior). Every success carries a
`via: "primary" | "fallback"` tag (clients ignore it). Error messages
never include URLs — the VPS path embeds its token. Live-tested Oct 28:
`via: primary`, 16 s, clean content.

## Costs

- VPS: ~1 GB disk, ~2 GB RAM for the loaded model. No per-token billing.
- Cloud fallback (optional): keep a funded `LLM_API_KEY` out of the secrets
  and the app keeps working as today — the secrets simply choose the brain.
