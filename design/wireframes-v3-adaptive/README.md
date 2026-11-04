# Bolingo Learn — Adaptive life-stage wireframes (v3)

A standalone, clickable design deliverable. It is **not imported by the app**.

```bash
python -m http.server 4174 --directory design
# → http://localhost:4174/wireframes-v3-adaptive/
```

Serve it from the `design/` folder, because the page reuses Bingo and learner art from `../wireframes-v2/assets`.

## What's inside

- **Age dial (hero):** dragging 10 → 40 re-themes the whole board. It uses the same rules as `lib/lifeStage.ts`: typeface, palette, gamification, density, session length, audio-first and celebration style.
- **Five phones per tier:**
  - **Explorer (10–18):** quest map, boss battle with combos, loot chest and level ring, squad tournament, avatar studio.
  - **Launcher (19–25):** goal dashboard, live study room with a focus timer, portfolio project, job match driven by proven skills, verified credential.
  - **Climber (26–40):** "Your five minutes", offline commute player, spaced-repetition card, certificate track with a forecast finish date, weekly insight.
- **Same moment, three tiers:** how one "lesson complete" event pays off differently for each tier.
- **Reward loops:** the trigger, action, reward and investment loop for each tier, and what the design adds over each category leader.
- **Guardrails:** ethical limits, especially for under-18s:
  - chests always pay out, and rewards are cosmetic and cannot be bought;
  - daily play caps and quiet hours;
  - tournaments are invite-only;
  - job-match scores use proven skills only.

Fonts by tier: Baloo 2 (Explorer), Bricolage Grotesque with Schibsted Grotesk (Launcher), Fraunces with Instrument Sans (Climber).
