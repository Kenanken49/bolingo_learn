import type { OwlMood } from './DuoOwl';
import BingoOwl from './BingoOwl';
import MascotClip from './MascotClip';

/**
 * BINGO — Synfig-ready clip loader with a still-frame owl fallback.
 *
 * Bingo is wired FIRST: every `character="bingo"` in the app resolves here
 * (see AfricanMascots default export), so dropping a Synfig render upgrades
 * all Bingo spots at once with no call-site changes.
 *
 * Mood → clip mapping (one folder per mood, transparent PNG sequence):
 *   happy → assets/characters/export/bingo-happy/frame-000.png …
 *   sad   → assets/characters/export/bingo-sad/frame-000.png …
 *   party → assets/characters/export/bingo-party/frame-000.png …
 * Plus `manifest.json` per folder: { "frames": 72, "fps": 24 }.
 *
 * Until those folders land, renders the purple owl (BingoOwl) with
 * pre-rendered mood frames — transparent background, theme-safe. No native
 * SVG module: frame playback is a plain timer over <Image>, works on Expo
 * Go / web / dev clients without a rebuild.
 */

export type BingoMood = OwlMood;

export const BINGO_CLIPS: Record<BingoMood, { folder: string; manifest: string }> = {
  happy: {
    folder: 'assets/characters/export/bingo-happy',
    manifest: 'assets/characters/export/bingo-happy/manifest.json',
  },
  sad: {
    folder: 'assets/characters/export/bingo-sad',
    manifest: 'assets/characters/export/bingo-sad/manifest.json',
  },
  party: {
    folder: 'assets/characters/export/bingo-party',
    manifest: 'assets/characters/export/bingo-party/manifest.json',
  },
};

/**
 * Manifest a Synfig export must contain (written by hand or by script):
 *   { "frames": 72, "fps": 24 }
 * Frame files: frame-000.png … frame-071.png, transparent PNGs from
 * Synfig Render → PNG sequence (alpha on, background off).
 */
export interface BingoManifest {
  frames: number;
  fps: number;
}

/** Where to point `require()` once an export exists (kept in one place). */
export function bingoFramePath(mood: BingoMood, index: number): string {
  const n = String(index).padStart(3, '0');
  return `${BINGO_CLIPS[mood].folder}/frame-${n}.png`;
}

function useBingoFrames(mood: BingoMood): { uris: string[]; fps: number } {
  // No static require() of export frames here on purpose: the folders do
  // not exist yet, and a static require would break the bundle. When the
  // Synfig PNG sequence lands, replace the body with explicit requires,
  // e.g. `require('../assets/characters/export/bingo-happy/frame-000.png')`
  // per frame (Metro needs static literals), or remote URIs after upload.
  void mood;
  return { uris: [], fps: 24 };
}

export default function Bingo({
  mood = 'happy',
  size = 96,
}: {
  mood?: BingoMood;
  size?: number;
}) {
  const { uris, fps } = useBingoFrames(mood);

  // Synfig clip present → play the PNG sequence (transparent, theme-safe).
  if (uris.length > 0) {
    return (
      <MascotClip
        key={mood}
        uris={uris}
        fps={fps}
        width={size}
        height={size * 1.08}
        label={
          mood === 'sad'
            ? 'Bingo the owl looking sad'
            : mood === 'party'
              ? 'Bingo the owl celebrating'
              : 'Bingo the owl, happy'
        }
      />
    );
  }

  // No export yet → the purple owl, animated in-code.
  return <BingoOwl mood={mood} size={size} />;
}
