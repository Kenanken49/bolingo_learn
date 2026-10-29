// Reward cues. QUIZ_CORRECT and WRONG_CUE are mastered 44.1 kHz stereo assets
// synthesized by scripts/generate-chime.py: warm body, soft mallets/bells, a
// breathy strike and a true-stereo room.
//
//   QUIZ_CORRECT  ~1.2s  bright C-major add9 sparkle for one right answer
//   CELEBRATION   5.00s   crowd applause, prepared by scripts/prepare-celebration.py
//   WRONG_CUE     ~0.9s  wooden G5-E5 descent — a nudge, never a buzzer

/** ~1.2s answer cue: bright, complete, and out of the way of the next question. */
export const QUIZ_CORRECT: number = require('./audio/quiz-correct.wav');

/** 5.00s results/chest applause: a real cheering crowd, faded in and out cleanly. */
export const CELEBRATION: number = require('./audio/celebration.wav');

/** ~0.9s correction cue: soft, low-passed wooden descent with no harsh edge. */
export const WRONG_CUE: number = require('./audio/wrong-answer.wav');
