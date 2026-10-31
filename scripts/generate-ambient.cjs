/* global Buffer, __dirname -- Node CJS globals. */

/**
 * Generates assets/audio/ambient-grove.wav — a seamless, low-volume
 * ambient pad for the home screen. Natural palette in sound form:
 * a slow Cmaj9 → Am9 → Fmaj7 → G6 progression with airy pads and sparse
 * pentatonic bells. No external samples, no dependencies.
 *
 * Run: node scripts/generate-ambient.cjs
 */
const fs = require('fs');
const path = require('path');

const SR = 22050;
const LOOP = 24; // audible loop length (s)
const XF = 2.5; // crossfade tail (s) mixed into the head for a click-free loop
const TOTAL = LOOP + XF;
const n = Math.ceil(SR * TOTAL);
const buf = new Float64Array(n);

const chords = [
  { t: 0, notes: [130.81, 164.81, 196.0, 246.94, 293.66] }, // Cmaj9
  { t: 6, notes: [110.0, 130.81, 164.81, 196.0, 246.94] }, // Am9
  { t: 12, notes: [87.31, 110.0, 130.81, 164.81] }, // Fmaj7
  { t: 18, notes: [98.0, 123.47, 146.83, 164.81, 220.0] }, // G6/9
];

function addPad(start, freq, amp) {
  const dur = 7.2;
  const attack = 1.7;
  const release = 2.6;
  const from = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  const detune = 1.0012;
  for (let i = 0; i < len; i++) {
    const idx = from + i;
    if (idx >= n) break;
    const t = i / SR;
    const env =
      t < attack
        ? 0.5 - 0.5 * Math.cos((Math.PI * t) / attack)
        : t > dur - release
          ? 0.5 + 0.5 * Math.cos((Math.PI * (t - (dur - release))) / release)
          : 1;
    const wobble = 1 + 0.0035 * Math.sin(2 * Math.PI * 0.07 * t + freq);
    const v =
      Math.sin(2 * Math.PI * freq * t) +
      0.32 * Math.sin(2 * Math.PI * freq * 2 * t) +
      0.45 * Math.sin(2 * Math.PI * freq * detune * t);
    buf[idx] += amp * env * wobble * v;
  }
}

for (const c of chords) for (const f of c.notes) addPad(c.t, f, 0.072);

const bells = [
  { t: 1.6, f: 523.25 },
  { t: 5.4, f: 659.25 },
  { t: 10.9, f: 587.33 },
  { t: 15.2, f: 783.99 },
  { t: 20.4, f: 659.25 },
];
for (const b of bells) {
  const from = Math.floor(b.t * SR);
  const len = Math.floor(5.2 * SR);
  for (let i = 0; i < len; i++) {
    const idx = from + i;
    if (idx >= n) break;
    const t = i / SR;
    const env = Math.exp(-t * 1.35) * (1 - Math.exp(-t * 90));
    const v =
      Math.sin(2 * Math.PI * b.f * t) +
      0.28 * Math.sin(2 * Math.PI * b.f * 2.01 * t) +
      0.1 * Math.sin(2 * Math.PI * b.f * 3.02 * t);
    buf[idx] += 0.052 * env * v;
  }
}

// Airy bed: heavily low-passed noise, slowly breathing.
let lp = 0;
for (let i = 0; i < n; i++) {
  const t = i / SR;
  const white = Math.random() * 2 - 1;
  lp += 0.055 * (white - lp);
  buf[i] += 0.03 * lp * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.055 * t));
}

// Soft saturation and peak normalise.
let peak = 0;
for (let i = 0; i < n; i++) {
  buf[i] = Math.tanh(buf[i] * 1.1);
  peak = Math.max(peak, Math.abs(buf[i]));
}
const gain = peak > 0 ? 0.32 / peak : 1;
for (let i = 0; i < n; i++) buf[i] *= gain;

// Blend the tail into the head so the loop point is inaudible.
const L = Math.ceil(SR * LOOP);
const X = Math.ceil(SR * XF);
const out = new Float64Array(L);
for (let i = 0; i < L; i++) out[i] = buf[i];
for (let i = 0; i < X; i++) {
  const w = i / X;
  out[i] = out[i] * w + buf[L + i] * (1 - w);
}

// 16-bit PCM mono WAV.
const dataBytes = out.length * 2;
const file = Buffer.alloc(44 + dataBytes);
file.write('RIFF', 0);
file.writeUInt32LE(36 + dataBytes, 4);
file.write('WAVE', 8);
file.write('fmt ', 12);
file.writeUInt32LE(16, 16);
file.writeUInt16LE(1, 20);
file.writeUInt16LE(1, 22);
file.writeUInt32LE(SR, 24);
file.writeUInt32LE(SR * 2, 28);
file.writeUInt16LE(2, 32);
file.writeUInt16LE(16, 34);
file.write('data', 36);
file.writeUInt32LE(dataBytes, 40);
for (let i = 0; i < out.length; i++) {
  const s = Math.max(-1, Math.min(1, out[i]));
  file.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
}

const dest = path.join(__dirname, '..', 'assets', 'audio', 'ambient-grove.wav');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, file);
console.log(`wrote ${dest} (${(file.length / 1024).toFixed(0)} KB, ${LOOP}s @ ${SR} Hz)`);
