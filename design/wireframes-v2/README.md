# Bolingo Learn — Jungle Expedition screens

A standalone, click-through completion of the v1 wireframes. **Nothing in this
folder is imported by the app** — it is a design deliverable that lives beside
the Expo project, so the in-progress `src/` work is untouched.

## Open it

```bash
# from the repo root
python -m http.server 4173 --directory design/wireframes-v2
# → http://localhost:4173
```

Any static server works; there is no build step and no dependency.

## What is in here

```
index.html     nine screens: five phone, four desktop
styles.css     QD-OLED jungle tokens, per-habitat birds, light companion
app.js         filters, theme, token builder, auth preview, toasts
assets/        Livia's mentor portrait, neutral learner, Bingo moods
v1/            the original v1 wireframe decks, kept as the source spec
```

### The nine screens

| Screen | Route it mirrors | Interactive bit |
| --- | --- | --- |
| WF-APP-01 Learn path | `/` | Tap the active node → jumps to the lesson |
| WF-APP-02 Lesson player | `/quiz/[lessonId]` | Real token builder; `<p> Hello </p>` passes, wrong order fails |
| WF-APP-03 Scan & uploads | `/uploads` | Ready / failed rows with reason, retry and delete |
| WF-APP-04 Paywall | `/paywall` | Subscribe + restore feedback |
| WF-APP-05 Results | `/results` | Guest rescue card, continue toast |
| WF-WEB-01 Landing | marketing `/` | CTAs scroll to the app path / auth |
| WF-WEB-02 Learn dashboard | `/` at `lg` | Three-column layout with week + mentor cards |
| WF-WEB-03 Pricing | `/paywall` on web | Plan parity with the app |
| WF-WEB-04 Auth | `/auth` | Live signed-out ↔ signed-in preview |

The top bar filters **All / App / Web**, and the sun/moon button flips the whole
deck between the QD-OLED default and the light companion. Preferences are
stored in `localStorage`; no cookies, no network calls.

### Jungle expedition

Every screen is a camp on one rainforest trail, with its own resident bird and
accent pair. The canopy glow, bird watermark, top rule, caption passport and
card borders all change with the habitat; the black canvas and type system stay
constant so the product still reads as one place.

| Screen | Bird | Habitat | Accent |
| --- | --- | --- | --- |
| Learn path | 🦜 Kea | Canopy Trail | lime / cyan |
| Lesson player | 🐦 Kingfisher | River Run | cyan / mint |
| Scan & uploads | 🕊️ Swift | Mistfall | cyan / lime |
| Paywall | 🦚 Peacock | Summit Pass | amber / violet |
| Results | 🦚 Bird of Paradise | Victory Glade | magenta / amber |
| Landing | 🦜 Kea | Canopy Trail | lime / cyan |
| Learn dashboard | 🦜 Quetzal | Scholar's Grove | green / magenta |
| Pricing | 🦚 Peacock | Summit Pass | amber / violet |
| Auth | 🐦 Sunbird | Trailhead Gate | magenta / amber |

The app's `lib/jungle.ts` is the single source of truth for these habitats; the
router-level `ExpeditionBackdrop` paints the same bird, glow and canopy behind
every route.

### The characters

The trio has separate teaching roles in the app:

- **Bingo** — the emotional anchor: streaks, wins, and the hint button.
- **Livia** — the language mentor: language coach marks, answer explanations,
  conversation practice, and results praise.
- **Zora** — the build coach: code-lesson coach marks, project build tips, and
  the UI/UX Design Lab.

Livia's high-detail portrait (`assets/mentor.png`, copied from the app's
`assets/characters/livia-portrait.png`) floats beside Bingo in the landing hero
and anchors the dashboard's **Your mentor** card. The app renders the same
portrait in `components/Livia.tsx`, with mood motion instead of the old
in-code vector. Zora's old in-code vector is gone: `components/Zora.tsx` now renders the
Figma-frame character portrait (`assets/characters/zora-portrait.png`) in the
build-coach surfaces.

### QD-OLED

The deck defaults to the QD-OLED display: true black, off-pixel surfaces, and
quantum-dot colour. The jungle is painted with accent light rather than filled
surfaces, so OLED pixels stay off where they should. The moon/sun control still
switches to the light "quantum paper" palette; the choice is stored per browser.

The learner is deliberately neutral (`assets/learner.svg`): a silhouette stands
in for the signed-in person in the HUD, social-proof row, weekly card and auth
state. The app's `LearnerAvatar` does the same with a user glyph, so a real
OAuth photo can drop in without reusing a named character's face.

Bingo uses the shipped `bingo-happy` / `bingo-party` renders.

## Scope

This is a **design deck**, not a second app: there is no data layer, routing,
or persistence, and buttons only demonstrate the intended state change. The
production flows remain in `src/app/*` and `components/*`. The `v1/` copies are
the untouched originals, useful for comparing the low-fi intent with the hi-fi
completion.
