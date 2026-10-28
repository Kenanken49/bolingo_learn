# Kiki analytics pipeline

Validates the brain against live learners instead of only simulations.

## How it works

1. **Log** — `kikiAttempt()` in `lib/kikiStore.ts` fires one best-effort
   `kiki_attempts` row per graded answer (signed-in learners only; guests
   stay device-local; failures only warn). Needs the table once:
   Supabase dashboard → SQL editor → paste the "Kiki v3 analytics" block
   from `supabase/schema.sql` → Run (includes the service_role read grant).
2. **Calibrate** — `node scripts/kiki-calibrate.cjs [--since YYYY-MM-DD]`:
   coverage, decile calibration bins, Brier skill, and per-type
   hardest-decile floors vs the locked `GUESS_MCQ` / `GUESS_BUILD`.
3. **Lock** — a FLAG means live data disagrees with the sim: re-center
   `scripts/kiki-tune-mixed.cjs` on the observed floor and re-lock.

Verdicts need n≥100 per type (`--min-n` overrides); below that the script
says INSUFFICIENT DATA rather than guessing.
