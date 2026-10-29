import type { OwlMood } from './DuoOwl';

/**
 * Shared Synfig clip contract for Livia + Zora (Bingo documents its own
 * identical map in components/Bingo.tsx).
 *
 * One transparent PNG sequence per character per mood:
 *   assets/characters/export/<character>-<mood>/frame-000.png … + manifest.json
 * Manifest: { "frames": 72, "fps": 24 }.
 */

export type MascotClipCharacter = 'livia' | 'zora';

export interface MascotClipManifest {
  frames: number;
  fps: number;
}

export function clipFolder(character: MascotClipCharacter, mood: OwlMood): string {
  return `assets/characters/export/${character}-${mood}`;
}

export function clipFramePath(character: MascotClipCharacter, mood: OwlMood, index: number): string {
  const n = String(index).padStart(3, '0');
  return `${clipFolder(character, mood)}/frame-${n}.png`;
}

/**
 * Placeholder hook: returns no frames until the Synfig export lands.
 * No static require() here on purpose — the folders do not exist yet and a
 * static require would break the bundle. When PNGs land, replace the body
 * with explicit per-frame requires (Metro needs static literals).
 */
export function useClipFrames(
  _character: MascotClipCharacter,
  _mood: OwlMood,
): { uris: string[]; fps: number } {
  void _character;
  void _mood;
  return { uris: [], fps: 24 };
}
