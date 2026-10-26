// Tiny synthesized chimes as WAV data-URIs (no binary assets to manage) —
// ~0.35s cheerful major-third arpeggio (correct), ~0.4s low buzz (wrong).
// Generated 8-bit 8kHz mono PCM; small enough to inline safely.

function wavDataUri(samples: number[]): string {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, Math.max(0, Math.min(255, 128 + samples[i])));
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

const tone = (freq: number, dur: number, rate = 8000) => {
  const out: number[] = [];
  const len = Math.floor(dur * rate);
  for (let i = 0; i < len; i++) {
    const env = Math.sin((Math.PI * i) / len); // smooth envelope
    out.push(Math.round(70 * env * Math.sin((2 * Math.PI * freq * i) / rate)));
  }
  return out;
};

export const CORRECT_CHIME = wavDataUri([...tone(660, 0.12), ...tone(880, 0.12), ...tone(1320, 0.16)]);
export const WRONG_BUZZ = wavDataUri(tone(180, 0.4));
