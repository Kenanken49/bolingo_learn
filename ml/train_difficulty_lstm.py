"""Train the difficulty LSTM on simulated learners and export it to ONNX.

Real attempt logs in bolingo.db are too uniform to learn from (one lesson
position, ~99.5% accuracy), so each simulated learner has a latent ability.
Their answer accuracy at difficulty L follows sigmoid(SLOPE * (ability - L)),
and attempts update the same EMA profile the app uses (app/services/learner_profile.py).
The label is the level where expected accuracy equals the 0.8 target.

Model input : float32 (1, 40) profile, read as 10 steps of 4 features.
Model output: float32 (1, 1) level score in [1, 10].

Usage: python ml/train_difficulty_lstm.py [--out models/difficulty.onnx]
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

import numpy as np
import torch
from torch import nn

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.services.learner_profile import (  # noqa: E402
    DIFFICULTY_LEVELS,
    PROFILE_DIM,
    neutral_profile,
    update_profile,
)

TARGET_ACCURACY = 0.8
SLOPE = 2.0
STEPS, FEATURES = 10, 4
assert STEPS * FEATURES == PROFILE_DIM


def p_correct(ability: float, level: int) -> float:
    return 1.0 / (1.0 + math.exp(-SLOPE * (ability - level)))


def target_level(ability: float) -> float:
    # Level where p_correct == TARGET_ACCURACY, clamped to the playable range.
    level = ability - math.log(TARGET_ACCURACY / (1 - TARGET_ACCURACY)) / SLOPE
    return min(max(level, 1.0), float(DIFFICULTY_LEVELS))


def simulate_samples(n_learners: int, attempts: int, rng: random.Random):
    xs, ys = [], []
    for _ in range(n_learners):
        ability = rng.uniform(1.0, DIFFICULTY_LEVELS)
        label = target_level(ability)
        profile = neutral_profile()
        level = 1
        for _ in range(attempts):
            # Learner works near their current level, sometimes stretching up or down.
            level = min(max(level + rng.choice((-1, 0, 0, 1)), 1), DIFFICULTY_LEVELS)
            p = p_correct(ability, level)
            total = 5
            correct = sum(rng.random() < p for _ in range(total))
            profile = update_profile(profile, level, correct, total)
            xs.append(profile)
            ys.append(label)
    x = np.asarray(xs, dtype=np.float32)
    y = np.asarray(ys, dtype=np.float32).reshape(-1, 1)
    return x, y


class DifficultyLSTM(nn.Module):
    def __init__(self, hidden: int = 32) -> None:
        super().__init__()
        self.lstm = nn.LSTM(FEATURES, hidden, batch_first=True)
        self.head = nn.Linear(hidden, 1)

    def forward(self, profile: torch.Tensor) -> torch.Tensor:
        seq = profile.reshape(-1, STEPS, FEATURES)
        out, _ = self.lstm(seq)
        raw = self.head(out[:, -1, :])
        # Map to the valid level range [1, DIFFICULTY_LEVELS].
        return 1.0 + (DIFFICULTY_LEVELS - 1.0) * torch.sigmoid(raw)


def train(model: DifficultyLSTM, x: np.ndarray, y: np.ndarray, epochs: int) -> float:
    torch.manual_seed(0)
    xt, yt = torch.from_numpy(x), torch.from_numpy(y)
    opt = torch.optim.Adam(model.parameters(), lr=3e-3)
    loss_fn = nn.MSELoss()
    n = len(xt)
    for epoch in range(epochs):
        perm = torch.randperm(n)
        for i in range(0, n, 256):
            idx = perm[i : i + 256]
            opt.zero_grad()
            loss = loss_fn(model(xt[idx]), yt[idx])
            loss.backward()
            opt.step()
        if epoch % 5 == 0 or epoch == epochs - 1:
            with torch.no_grad():
                mae = (model(xt) - yt).abs().mean().item()
            print(f"epoch {epoch:3d}  train MAE {mae:.3f} levels")
    with torch.no_grad():
        return (model(xt) - yt).abs().mean().item()


def export_onnx(model: DifficultyLSTM, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    model.eval()
    dummy = torch.zeros(1, PROFILE_DIM, dtype=torch.float32)
    torch.onnx.export(
        model,
        dummy,
        str(out),
        input_names=["profile"],
        output_names=["level_score"],
        dynamic_axes={"profile": {0: "batch"}, "level_score": {0: "batch"}},
        opset_version=17,
    )


def verify(model: DifficultyLSTM, out: Path, x: np.ndarray) -> float:
    import onnxruntime as ort

    session = ort.InferenceSession(str(out), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name
    sample = x[:500]
    with torch.no_grad():
        expected = model(torch.from_numpy(sample)).numpy()
    got = session.run(None, {name: sample})[0]
    return float(np.max(np.abs(expected - got)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(ROOT / "models" / "difficulty.onnx"))
    parser.add_argument("--learners", type=int, default=4000)
    parser.add_argument("--attempts", type=int, default=30)
    parser.add_argument("--epochs", type=int, default=40)
    args = parser.parse_args()

    rng = random.Random(0)
    x, y = simulate_samples(args.learners, args.attempts, rng)
    print(f"samples: {len(x)} from {args.learners} simulated learners")

    model = DifficultyLSTM()
    train_mae = train(model, x, y, args.epochs)

    baseline = float(np.mean(np.abs(y - y.mean())))
    print(f"train MAE {train_mae:.3f} vs predict-the-mean baseline {baseline:.3f}")

    out = Path(args.out)
    export_onnx(model, out)
    diff = verify(model, out, x)
    print(f"exported {out} ; max |torch - onnxruntime| = {diff:.2e}")
    if diff > 1e-4:
        raise SystemExit("ONNX output does not match PyTorch")


if __name__ == "__main__":
    main()
