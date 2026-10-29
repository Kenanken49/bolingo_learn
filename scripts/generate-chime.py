"""
Generate the Bolingo reward cues.

Two synthesized cues, plus the prepared applause:

  quiz-correct.wav  ~1.2s  quick C5-E5-G5-D6 sparkle for a single right answer.
                           Bright onset, tiny halo, short room — it has to feel
                           good without holding up the next question.

  wrong-answer.wav  ~0.9s  a soft wooden G5-E5 descent. No buzzer, no square
                           edge: low-passed mallets, a little body, and a short
                           room, so a mistake feels like a nudge, not a shock.

  celebration.wav is NOT synthesized here. It is the 5.00s crowd applause
  prepared by scripts/prepare-celebration.py, so re-running this script never
  overwrites the default results/chest cue.

Both synthesized cues share one palette: warm low body, detuned bell/mallet
partials, a breathy strike, true-stereo room, and gentle mastering. No samples.

Run from the repo root:
    python scripts/generate-chime.py
"""

from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

SR = 44_100
AUDIO_DIR = Path(__file__).resolve().parent.parent / "assets" / "audio"

rng = np.random.default_rng(7)


def equal_power_pan(pan: float) -> tuple[float, float]:
    """pan in -1..1 -> constant-power stereo gains."""
    theta = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4.0
    return math.cos(theta), math.sin(theta)


def fft_filter(x: np.ndarray, low: float | None = None, high: float | None = None) -> np.ndarray:
    """Gentle zero-phase FFT low/high shelf; avoids scipy and phase smearing."""
    spectrum = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / SR)
    gain = np.ones_like(freqs)
    if high is not None:
        gain *= 1.0 / np.sqrt(1.0 + (freqs / high) ** 4)
    if low is not None:
        gain *= 1.0 / np.sqrt(1.0 + (low / np.maximum(freqs, 1e-6)) ** 4)
    return np.fft.irfft(spectrum * gain, len(x))


def add_note(
    mix: np.ndarray,
    freq: float,
    start: float,
    gain: float,
    pan: float,
    decay: float,
    attack: float = 0.012,
    warmth: float = 0.0,
) -> None:
    """One organic mallet-bell voice with a soft body and a breathy onset."""
    begin = int(start * SR)
    if begin >= len(mix):
        return
    count = len(mix) - begin
    t = np.arange(count) / SR
    env = (1.0 - np.exp(-t / max(attack, 1e-4))) ** 1.15 * np.exp(-t / decay)

    # A tiny, delayed vibrato keeps long tails from sounding like a test tone.
    drift = np.clip((t - 0.16) / 0.55, 0.0, 1.0)
    vibrato = 1.0 + 0.0011 * np.sin(2 * math.pi * 4.8 * t + 0.35) * drift
    phase = 2 * math.pi * freq * t * vibrato

    # Bell partials, gently rolled off; 2.76 adds the woody "mallet" colour.
    partials = (
        (1.000, 1.000, 0.00),
        (2.001, 0.200, 0.18),
        (2.760, 0.055, 0.55),
        (3.000, 0.055, 0.00),
        (4.080, 0.022, 0.30),
    )
    tone = sum(amp * np.sin(phase * ratio + offset) for ratio, amp, offset in partials)

    # Detuned companion + a warm sub-octave for body on small phone speakers.
    tone += 0.11 * np.sin(2 * math.pi * freq * 1.0032 * t + 0.2)
    if warmth:
        tone += warmth * np.sin(2 * math.pi * (freq * 0.5) * t)

    # Soft filtered chiff at the strike: air, not a click.
    chiff_len = min(count, int(0.055 * SR))
    if chiff_len:
        chiff_t = np.arange(chiff_len) / SR
        chiff_env = np.exp(-chiff_t / 0.012) * (1.0 - np.exp(-chiff_t / 0.002))
        chiff = rng.standard_normal(chiff_len) * chiff_env * 0.018
        chiff = fft_filter(chiff, low=1800, high=9000)
        tone[:chiff_len] += chiff

    voice = gain * tone * env
    left, right = equal_power_pan(pan)
    mix[begin:, 0] += voice * left
    mix[begin:, 1] += voice * right


def add_soft_mallet(
    mix: np.ndarray,
    freq: float,
    start: float,
    gain: float,
    pan: float,
    decay: float,
    attack: float = 0.018,
) -> None:
    """Warm wooden mallet: no bell-like highs, no click, just a soft thud.

    The tiny pitch settle and the sub-octave are what make it feel like a
    struck object rather than a synth tone; the filtered noise is the mallet
    head touching wood, not a transient.
    """
    begin = int(start * SR)
    if begin >= len(mix):
        return
    count = len(mix) - begin
    t = np.arange(count) / SR
    env = (1.0 - np.exp(-t / max(attack, 1e-4))) ** 1.35 * np.exp(-t / decay)

    # A micro downward settle (~12 cents at the strike) keeps it organic.
    settle = 1.0 + 0.0007 * np.exp(-t / 0.16)
    phase = 2 * math.pi * freq * t * settle
    tone = (
        np.sin(phase)
        + 0.070 * np.sin(2 * phase + 0.50)
        + 0.015 * np.sin(3 * phase + 1.10)
        + 0.050 * np.sin(0.5 * phase)
    )

    # Wood, not click: a very short low-mid noise brush under the attack.
    tap_len = min(count, int(0.045 * SR))
    if tap_len:
        tap_t = np.arange(tap_len) / SR
        tap_env = np.exp(-tap_t / 0.014) * (1.0 - np.exp(-tap_t / 0.002))
        tap = fft_filter(rng.standard_normal(tap_len), low=240, high=1100) * tap_env * 0.012
        tone[:tap_len] += tap

    voice = gain * tone * env
    left, right = equal_power_pan(pan)
    mix[begin:, 0] += voice * left
    mix[begin:, 1] += voice * right


def add_air(mix: np.ndarray, start: float, stop: float, gain: float, tail: float = 0.9) -> None:
    """High, quiet breath that swells after the strike — not a cymbal."""
    begin = int(start * SR)
    end = min(len(mix), int(stop * SR))
    if end <= begin:
        return
    t = np.arange(end - begin) / SR
    span = (end - begin) / SR
    env = np.clip(t / 0.15, 0, 1) * np.exp(-np.maximum(t - 0.15, 0) / tail)
    env *= np.clip((span - t) / 0.35, 0, 1)
    air = fft_filter(rng.standard_normal(end - begin), low=5200, high=13500) * env * gain
    mix[begin:end, 0] += air * 0.7
    mix[begin:end, 1] += air * 0.9


def make_room(seconds: float, decay: float) -> tuple[np.ndarray, np.ndarray]:
    """Small, damped room: early reflections plus a diffuse, stereo tail."""
    length = int(seconds * SR)
    t = np.arange(length) / SR
    left = np.zeros(length)
    right = np.zeros(length)

    # Sparse early reflections keep the space readable on phone speakers.
    for delay_ms, level, pan in (
        (19, 0.55, -0.45),
        (31, 0.40, 0.55),
        (47, 0.30, -0.25),
        (67, 0.22, 0.35),
        (89, 0.16, -0.55),
    ):
        idx = int(delay_ms / 1000 * SR)
        left[idx] += level * (1 - (pan + 1) / 2)
        right[idx] += level * ((pan + 1) / 2)

    # Diffuse tail: decorrelated noise, rolling off the highs as it decays.
    tail_env = np.exp(-t * decay) * np.clip(t / 0.03, 0.0, 1.0)
    left += fft_filter(rng.standard_normal(length), high=5200) * tail_env * 0.24
    right += fft_filter(rng.standard_normal(length), high=4800) * tail_env * 0.24

    # A few thousandths of a second of offset gives width without chorus.
    right = np.roll(right, 13)
    return left, right


def convolve(signal: np.ndarray, impulse: np.ndarray) -> np.ndarray:
    size = len(signal) + len(impulse) - 1
    nfft = 1 << (size - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(signal, nfft) * np.fft.rfft(impulse, nfft), nfft)
    return wet[: len(signal)]


def master(
    mix: np.ndarray,
    fade_start: float,
    fade_len: float,
    wet: float = 0.23,
    peak_target: float = 0.88,
    drive: float = 1.25,
    lowpass: float = 12000,
) -> np.ndarray:
    """Room, gentle glue and a calm fade; peak-normalised for playback.

    Peak-normalised per cue, so the short answer sparkle stays bright without
    pushing the correction cue into the limiter.
    """
    ir_l, ir_r = make_room(max(0.6, len(mix) / SR - 0.4), decay=6.5 if len(mix) < 2 * SR else 2.2)
    wet_l = fft_filter(convolve(mix[:, 0], ir_l), low=110, high=7000)
    wet_r = fft_filter(convolve(mix[:, 1], ir_r), low=110, high=7000)
    wet_mix = np.stack([wet_l, wet_r], axis=1)
    mix = mix * (1.0 - wet) + wet_mix * wet

    # Remove rumble and fizz, add very gentle glue.
    mix[:, 0] = fft_filter(mix[:, 0], low=35, high=lowpass)
    mix[:, 1] = fft_filter(mix[:, 1], low=35, high=lowpass)
    mix = np.tanh(mix * drive) / math.tanh(drive)

    start = int(fade_start * SR)
    fade_t = np.arange(len(mix) - start) / SR
    mix[start:] *= (0.5 + 0.5 * np.cos(np.pi * np.clip(fade_t / fade_len, 0, 1)))[:, None]

    peak = float(np.max(np.abs(mix)))
    if peak > 1e-9:
        mix *= peak_target / peak
    return mix


def build_quiz_correct() -> np.ndarray:
    """Quick answer cue: the motif's front half, no long resolution."""
    mix = np.zeros((int(SR * 1.2), 2), dtype=np.float64)

    # Warm body, just enough to keep phone speakers from sounding thin.
    add_note(mix, 261.63, 0.000, 0.050, -0.28, decay=0.46, attack=0.045)
    add_note(mix, 392.00, 0.026, 0.032, 0.30, decay=0.40, attack=0.060)

    # C5-E5-G5-D6, spaced tightly enough to finish before the next question.
    for freq, start, gain, pan, decay in (
        (523.25, 0.000, 0.205, -0.22, 0.33),  # C5
        (659.25, 0.062, 0.215, 0.12, 0.32),   # E5
        (783.99, 0.124, 0.225, -0.05, 0.30),  # G5
        (1174.66, 0.196, 0.170, 0.22, 0.26),  # D6 (add9)
    ):
        add_note(mix, freq, start, gain, pan, decay, attack=0.008, warmth=0.04)

    # A single quiet halo so it glows, but does not linger.
    add_note(mix, 1046.50, 0.238, 0.040, -0.34, decay=0.28, attack=0.055)
    add_note(mix, 1318.51, 0.262, 0.030, 0.30, decay=0.26, attack=0.065)

    add_air(mix, 0.08, 0.95, 0.006, tail=0.45)
    return master(mix, fade_start=0.92, fade_len=0.26, wet=0.18)


def build_wrong_answer() -> np.ndarray:
    """Gentle correction: a wooden G5-E5 descent, no buzz or square edge.

    It sits an octave above the low body on purpose: phone speakers drop off
    below ~500 Hz, so the fundamentals need to be high enough to be heard
    while the low-pass keeps every edge off them.
    """
    mix = np.zeros((int(SR * 0.95), 2), dtype=np.float64)

    # A quiet low G under the pair gives body on small speakers.
    add_soft_mallet(mix, 392.00, 0.000, 0.030, -0.05, decay=0.55, attack=0.035)
    add_soft_mallet(mix, 783.99, 0.000, 0.175, -0.18, decay=0.30, attack=0.016)
    add_soft_mallet(mix, 659.25, 0.145, 0.190, 0.14, decay=0.40, attack=0.018)

    return master(
        mix,
        fade_start=0.64,
        fade_len=0.28,
        wet=0.22,
        peak_target=0.58,
        drive=1.02,
        lowpass=3000,
    )


def write_wav(path: Path, samples: np.ndarray) -> None:
    # TPDF dither at one LSB keeps the long tail smooth after 16-bit quantisation.
    dither = (rng.random(samples.shape) - rng.random(samples.shape)) / 32768.0
    pcm = np.clip(samples + dither, -1.0, 1.0)
    ints = np.round(pcm * 32767.0).astype("<i2")

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(ints.tobytes())


def report(path: Path, samples: np.ndarray) -> None:
    mono = samples.mean(axis=1)
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(mono**2)))
    spectrum = np.abs(np.fft.rfft(mono))
    freqs = np.fft.rfftfreq(len(mono), 1.0 / SR)
    centroid = float((freqs * spectrum).sum() / spectrum.sum())
    print(f"wrote {path.relative_to(path.parents[2])}")
    print(
        f"  duration {len(samples) / SR:.2f}s · peak {20 * math.log10(peak):.1f} dBFS"
        f" · rms {20 * math.log10(rms):.1f} dBFS · centroid {centroid:.0f} Hz"
    )


if __name__ == "__main__":
    for name, build in (
        ("quiz-correct.wav", build_quiz_correct),
        ("wrong-answer.wav", build_wrong_answer),
    ):
        audio = build()
        path = AUDIO_DIR / name
        write_wav(path, audio)
        report(path, audio)
