import Bingo from './Bingo';
import Livia from './Livia';
import Zora from './Zora';
import type { OwlMood } from './DuoOwl';

/**
 * Bolingo mascot trio — proudly African, fully animated per scenario:
 *  - BINGO the Kea (forward-facing mountain parrot): the emotional anchor.
 *    Celebrates wins, guilt-trips fading streaks, coaches first lessons.
 *  - LIVIA: warm mentor in high-detail portrait form (ankara print, gold
 *    earrings). Owns language learning: greets newcomers, guides language
 *    lessons, explains answers, and runs conversation practice.
 *  - ZORA: energetic young coder (fade haircut, kitenge-trim tee). Owns the
 *    build track: code-lesson coach marks, project hints, and the design lab.
 *
 * This module is a thin router only. Each character owns its own file with a
 * Synfig-ready clip loader + a built-in fallback (Bingo draws a vector; Livia
 * and Zora ship Figma-style portraits), so a render lands per character
 * without touching any call site:
 *   Bingo → assets/characters/export/bingo-{happy,sad,party}/
 *   Livia → assets/characters/export/livia-{happy,sad,party}/
 *   Zora  → assets/characters/export/zora-{happy,sad,party}/
 */
export type MascotCharacter = 'bingo' | 'livia' | 'zora';
export type MascotMood = OwlMood;

export { Livia, Zora };

/** Scenario picker: one face per outcome, Duolingo-style. */
export default function Mascot({
  character = 'bingo',
  mood = 'happy',
  size = 96,
}: {
  character?: MascotCharacter;
  mood?: MascotMood;
  size?: number;
}) {
  if (character === 'livia') return <Livia mood={mood} size={size} />;
  if (character === 'zora') return <Zora mood={mood} size={size} />;
  return <Bingo mood={mood} size={size} />;
}
