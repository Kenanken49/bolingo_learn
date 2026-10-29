"""
Prepare the default celebration cue from a crowd-applause recording.

The clip is cut to exactly 5.00 seconds from the strongest part of the
recording, given a short fade-in and fade-out, and peak-normalised for the
app. It is the real applause used for results and chest claims; the other
two cues stay synthesized in scripts/generate-chime.py.

Usage:
    python scripts/prepare-celebration.py "path/to/applause.mp3"

Writes:
    assets/audio/celebration.wav  (5.00 s, 44.1 kHz, 16-bit stereo)

Requires soundfile (libsndfile), which decodes MP3:
    python -m pip install soundfile
"""

from __future__ import annotations

import math
import sys
import wave
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44_100
DURATION = 5.00
START = 0.50  # skip the source's own fade-in; this is the strongest 5s window
FADE_IN = 0.04
FADE_OUT = 0.35
PEAK_TARGET = 0.88  # -1.1 dBFS
OUT = Path(__file__).resolve().parent.parent / "assets" / "audio" / "celebration.wav"

rng = np.random.default_rng(11)


def resample(channel: np.ndarray, source_sr: int) -> np.ndarray:
    """Linear resample is enough for a crowd bed; source is already 44.1 kHz."""
    if source_sr == SR:
        return channel
    src_t = np.arange(len(channel)) / source_sr
    dst_t = np.arange(int(round(len(channel) * SR / source_sr))) / SR
    return np.interp(dst_t, src_t, channel)


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    source = Path(sys.argv[1])
    data, source_sr = sf.read(source, dtype="float64", always_2d=True)
    if data.shape[1] == 1:
        data = np.repeat(data, 2, axis=1)
    channels = [resample(data[:, i], source_sr) for i in range(2)]
    audio = np.stack(channels, axis=1)

    start = int(round(START * SR))
    count = int(round(DURATION * SR))
    if start + count > len(audio):
        start = max(0, len(audio) - count)
    audio = audio[start : start + count].copy()

    # Gentle cosine edges: the cut lands mid-crowd, so never start on a step.
    fade_in = min(len(audio), int(FADE_IN * SR))
    if fade_in:
        t = np.arange(fade_in) / fade_in
        audio[:fade_in] *= (0.5 - 0.5 * np.cos(np.pi * t))[:, None]
    fade_out = min(len(audio), int(FADE_OUT * SR))
    if fade_out:
        t = np.arange(fade_out) / fade_out
        audio[-fade_out:] *= (0.5 + 0.5 * np.cos(np.pi * t))[:, None]

    peak = float(np.max(np.abs(audio)))
    if peak > 1e-9:
        audio *= PEAK_TARGET / peak

    # TPDF dither at one LSB keeps the crowd bed smooth in 16-bit.
    dither = (rng.random(audio.shape) - rng.random(audio.shape)) / 32768.0
    pcm = np.clip(audio + dither, -1.0, 1.0)
    ints = np.round(pcm * 32767.0).astype("<i2")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(ints.tobytes())

    mono = audio.mean(axis=1)
    rms = float(np.sqrt(np.mean(mono**2)))
    spectrum = np.abs(np.fft.rfft(mono))
    freqs = np.fft.rfftfreq(len(mono), 1.0 / SR)
    centroid = float((freqs * spectrum).sum() / spectrum.sum())
    print(f"wrote {OUT.relative_to(OUT.parents[2])}")
    print(
        f"duration {len(audio) / SR:.2f}s · peak {20 * math.log10(np.max(np.abs(audio))):.1f} dBFS"
        f" · rms {20 * math.log10(rms):.1f} dBFS · centroid {centroid:.0f} Hz"
    )


if __name__ == "__main__":
    main()
