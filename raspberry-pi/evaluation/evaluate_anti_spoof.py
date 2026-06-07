#!/usr/bin/env python3
"""
Anti-spoof / liveness evaluation — live vs spoof images → TP/TN/FP/FN.

Dataset layout (under --dataset, default: evaluation/datasets/anti_spoof):

  live/*.jpg   real faces (positive class — should pass)
  spoof/*.jpg  attacks / screens / prints (negative class — should fail)

Usage (from raspberry-pi/):
  python -m evaluation.evaluate_anti_spoof
  python -m evaluation.evaluate_anti_spoof --dataset evaluation/datasets/anti_spoof
"""

from __future__ import annotations

import argparse
from pathlib import Path

from evaluation._bootstrap import EVAL_ROOT, bootstrap, save_results
from evaluation.metrics import ConfusionCounts, format_metrics, metrics_payload, update_counts

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def _list_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES
    )


def run_evaluation(dataset_dir: Path) -> dict:
    from gate.config import AntiSpoofConfig
    from gate.core.anti_spoof import AntiSpoof

    live_dir = dataset_dir / "live"
    spoof_dir = dataset_dir / "spoof"

    live_images = _list_images(live_dir)
    spoof_images = _list_images(spoof_dir)

    if not live_images and not spoof_images:
        raise SystemExit(
            f"No images found. Expected {live_dir} and/or {spoof_dir} with image files."
        )

    config = AntiSpoofConfig()
    config.enabled = True
    anti_spoof = AntiSpoof(config=config)
    anti_spoof.preload()

    counts = ConfusionCounts()
    skipped = 0
    errors: list[str] = []

    for path in live_images:
        result = anti_spoof.predict_image(path)
        if result.get("error"):
            skipped += 1
            errors.append(f"{path.name}: {result['error']}")
            continue
        update_counts(
            counts,
            actual_positive=True,
            predicted_positive=bool(result.get("passed")),
        )

    for path in spoof_images:
        result = anti_spoof.predict_image(path)
        if result.get("error"):
            skipped += 1
            errors.append(f"{path.name}: {result['error']}")
            continue
        update_counts(
            counts,
            actual_positive=False,
            predicted_positive=bool(result.get("passed")),
        )

    payload = metrics_payload(counts, system="anti_spoof")
    payload["dataset"] = str(dataset_dir)
    payload["skipped"] = skipped
    payload["live_images"] = len(live_images)
    payload["spoof_images"] = len(spoof_images)
    if errors:
        payload["errors"] = errors[:20]
    return payload


def main() -> int:
    bootstrap()

    parser = argparse.ArgumentParser(description="Evaluate Silent-Face anti-spoof model.")
    parser.add_argument(
        "--dataset",
        type=Path,
        default=EVAL_ROOT / "datasets" / "anti_spoof",
        help="Folder with live/ and spoof/ subdirectories",
    )
    args = parser.parse_args()

    dataset_dir = args.dataset.resolve()
    if not dataset_dir.is_dir():
        raise SystemExit(f"Dataset directory not found: {dataset_dir}")

    payload = run_evaluation(dataset_dir)

    print(format_metrics(payload["metrics"]))
    print(f"\nLive images : {payload['live_images']}")
    print(f"Spoof images: {payload['spoof_images']}")
    print(f"Skipped     : {payload['skipped']}")
    out = save_results("anti_spoof_metrics.json", payload)
    print(f"Results saved to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
