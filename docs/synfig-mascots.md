# Synfig Studio — download + mascot animation

Open-source replacement for the Meshy/Figma motion pass. GPLv3, free.

## 1. Download (Windows 64-bit, stable v1.5.5)
- Official page: https://www.synfig.org/download-stable/ (FREE DOWNLOAD, $2 optional)
- Direct latest exe: https://github.com/synfig/synfig/releases → v1.5.5 →
  `SynfigStudio-1.5.5-2026.03.15-win64-79bf7.exe` (~106 MB, win64)
  Portable alternative on same page: `...-win64-79bf7.zip` (~113 MB)
- Install: run exe → Next → Finish. Needs Windows 7+, dual-core. No account.
- Verify: open Synfig Studio → Canvas → Render → you should see the default canvas.

Older stable if 1.5.5 misbehaves: same releases page → v1.4.5 win64 exe.

## 2. Mascot sources (already in repo, transparent bg)
- `assets/characters/bingo-kea.svg` — Bingo forward-facing kea
- `assets/characters/livia-portrait.svg` — Livia mentor portrait source
- `assets/characters/zora-portrait.png` — Zora build-coach portrait
- `assets/characters/livia-mentor.svg` / `zora-coder.svg` — legacy vector sources
Each `<g id>` becomes a Synfig layer group on import (head / eyes / beak /
mouth-happy / wings / necklace …). Same hexes + mood names as the app
(`happy | sad | party` in components/DuoOwl.tsx).

## 3. Animate in Synfig (cutout workflow, no frame-by-frame)
1. File → Import each SVG. Encapsulate per character (right-click → Encapsulate).
2. Skeleton: use Skeleton Tool → bones for `wing-left`, `wing-right`,
   `arm-wave`, `head`. Bind layers to bones (Bone Influence).
3. Keyframes at 24fps, 72 frames (3s loop):
   - happy: body Y 0 → -6 → 0 (breathing); eyes ScaleY 100 → 12 → 100
     (blink at f36); Bingo wing-right rotation 0 → 30 → 0 (wave).
   - sad: body rotation -3 → +3 loop; tear layer (sky #7DD3FC circle under
     right eye) Y +0 → +14, opacity 1 → 0.6.
   - party: body Y 0 → -16 (spring); rotation -3 → +3; show party-hat layer.
4. Export: Render → PNG sequence with alpha (transparent) for app splash,
   or GIF/WebM for previews. Keep exports in `assets/characters/export/`
   (transparent only — never bake a background, stays theme-safe).

## 4. Back into the app — ALL THREE WIRED
`components/AfricanMascots.tsx` is a thin router; each character owns its
loader + vector fallback, so a Synfig render lands per character without
touching call sites:

| Character | Loader | Clip folders |
|---|---|---|
| Bingo | `components/Bingo.tsx` | `bingo-happy`, `bingo-sad`, `bingo-party` |
| Livia | `components/Livia.tsx` | `livia-happy`, `livia-sad`, `livia-party` |
| Zora | `components/Zora.tsx` | `zora-happy`, `zora-sad`, `zora-party` |

Livia and Zora now ship high-detail Figma-style portraits
(`livia-portrait.png`, `zora-portrait.png`) as their defaults; Bingo still
uses the vector kea. Clips replace portraits only when a manifest has frames.

Livia and Zora share the clip contract in `components/mascotClips.ts`
(`clipFramePath`, `useClipFrames`); Bingo documents the identical map inline.

Mood → clip mapping (exact filenames the loaders expect), per character:
- happy → `assets/characters/export/<character>-happy/frame-000.png` … `frame-071.png` + `manifest.json` { "frames": 72, "fps": 24 }
- sad → `assets/characters/export/<character>-sad/frame-000.png` … + manifest
- party → `assets/characters/export/<character>-party/frame-000.png` … + manifest

Manifests with `"frames": 0, "status": "pending-synfig-export"` are
placeholders — drop the 72 transparent PNGs per mood, update the manifest
to 72, then replace the `useClipFrames` / `useBingoFrames` body with static
requires per frame (Metro needs literal paths). Portraits stay in-lesson for
speed; clips are for onboarding/paywall hero moments.
