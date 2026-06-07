#!/usr/bin/env python3
"""
Face recognition evaluation — genuine vs impostor pairs → TP/TN/FP/FN.

Dataset layout (under --dataset, default: evaluation/datasets/face):

  gallery/<person_id>/*.jpg   enrollment images → reference embedding(s)
  genuine/<person_id>/*.jpg   same-person probes (positive class)
  impostor/<person_id>/*.jpg  different-person probes tested against person_id gallery

If impostor/ is empty or missing, use --auto-impostor to build impostor trials from
other identities' genuine probes.

Usage (from raspberry-pi/):
  python -m evaluation.evaluate_face
  python -m evaluation.evaluate_face --dataset evaluation/datasets/face --auto-impostor
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2 as cv
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

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


def _load_identities(root: Path) -> dict[str, list[Path]]:
    identities: dict[str, list[Path]] = {}
    if not root.is_dir():
        return identities
    for person_dir in sorted(root.iterdir()):
        if not person_dir.is_dir():
            continue
        images = _list_images(person_dir)
        if images:
            identities[person_dir.name] = images
    return identities


def _load_rgb(path: Path) -> np.ndarray | None:
    bgr = cv.imread(str(path))
    if bgr is None:
        return None
    return cv.cvtColor(bgr, cv.COLOR_BGR2RGB)


def _gallery_embeddings(verifier, images: list[Path]) -> np.ndarray | None:
    embeddings: list[np.ndarray] = []
    for path in images:
        rgb = _load_rgb(path)
        if rgb is None:
            continue
        face = verifier.detect_face_robust(rgb)
        if face is None:
            continue
        embeddings.append(verifier.get_embedding(face))
    if not embeddings:
        return None
    return np.asarray(embeddings, dtype="float32")


def _max_similarity(gallery: np.ndarray, probe_embedding: np.ndarray, mode: str) -> float:
    sims = cosine_similarity(gallery, probe_embedding.reshape(1, -1)).reshape(-1)
    if mode == "mean":
        return float(np.mean(sims))
    return float(np.max(sims))


def _evaluate_probe(
    verifier,
    *,
    gallery: np.ndarray,
    probe_path: Path,
    threshold: float,
    similarity_mode: str,
) -> tuple[bool, float] | None:
    rgb = _load_rgb(probe_path)
    if rgb is None:
        return None
    face = verifier.detect_face_robust(rgb)
    if face is None:
        return None
    embedding = verifier.get_embedding(face)
    similarity = _max_similarity(gallery, embedding, similarity_mode)
    return similarity >= threshold, similarity


def run_evaluation(
    dataset_dir: Path,
    *,
    threshold: float | None,
    auto_impostor: bool,
    max_impostor_pairs: int | None,
) -> dict:
    from gate.config import FaceVerifierConfig
    from gate.core.face_verifier import FaceVerifier

    config = FaceVerifierConfig()
    if threshold is not None:
        config.similarity_threshold = threshold
    threshold = config.similarity_threshold
    similarity_mode = config.multi_embedding_similarity.lower()

    gallery_root = dataset_dir / "gallery"
    genuine_root = dataset_dir / "genuine"
    impostor_root = dataset_dir / "impostor"

    gallery_ids = _load_identities(gallery_root)
    genuine_ids = _load_identities(genuine_root)
    impostor_ids = _load_identities(impostor_root)

    if not gallery_ids:
        raise SystemExit(f"No gallery identities found under {gallery_root}")

    verifier = FaceVerifier(config=config)
    galleries: dict[str, np.ndarray] = {}
    for person_id, images in gallery_ids.items():
        emb = _gallery_embeddings(verifier, images)
        if emb is not None:
            galleries[person_id] = emb

    if not galleries:
        raise SystemExit("Could not build any gallery embeddings (check images / face detection).")

    counts = ConfusionCounts()
    skipped = 0

    for person_id, probes in genuine_ids.items():
        gallery = galleries.get(person_id)
        if gallery is None:
            skipped += len(probes)
            continue
        for probe_path in probes:
            result = _evaluate_probe(
                verifier,
                gallery=gallery,
                probe_path=probe_path,
                threshold=threshold,
                similarity_mode=similarity_mode,
            )
            if result is None:
                skipped += 1
                continue
            predicted, _ = result
            update_counts(counts, actual_positive=True, predicted_positive=predicted)

    impostor_trials: list[tuple[str, Path]] = []
    for person_id, probes in impostor_ids.items():
        if person_id not in galleries:
            skipped += len(probes)
            continue
        for probe_path in probes:
            impostor_trials.append((person_id, probe_path))

    if auto_impostor and not impostor_trials:
        for target_id in galleries:
            for source_id, probes in genuine_ids.items():
                if source_id == target_id:
                    continue
                for probe_path in probes:
                    impostor_trials.append((target_id, probe_path))

    if max_impostor_pairs is not None and len(impostor_trials) > max_impostor_pairs:
        impostor_trials = impostor_trials[:max_impostor_pairs]

    for target_id, probe_path in impostor_trials:
        gallery = galleries[target_id]
        result = _evaluate_probe(
            verifier,
            gallery=gallery,
            probe_path=probe_path,
            threshold=threshold,
            similarity_mode=similarity_mode,
        )
        if result is None:
            skipped += 1
            continue
        predicted, _ = result
        update_counts(counts, actual_positive=False, predicted_positive=predicted)

    payload = metrics_payload(counts, system="face_recognition", threshold=threshold)
    payload["dataset"] = str(dataset_dir)
    payload["skipped"] = skipped
    payload["gallery_identities"] = len(galleries)
    payload["similarity_mode"] = similarity_mode
    return payload


def main() -> int:
    bootstrap()

    parser = argparse.ArgumentParser(description="Evaluate FaceNet 1:1 verification.")
    parser.add_argument(
        "--dataset",
        type=Path,
        default=EVAL_ROOT / "datasets" / "face",
        help="Root folder with gallery/, genuine/, impostor/",
    )
    parser.add_argument("--threshold", type=float, default=None, help="Similarity threshold override")
    parser.add_argument(
        "--auto-impostor",
        action="store_true",
        help="Generate impostor pairs from other identities' genuine probes",
    )
    parser.add_argument(
        "--max-impostor-pairs",
        type=int,
        default=None,
        help="Cap impostor comparisons (useful for large datasets)",
    )
    args = parser.parse_args()

    dataset_dir = args.dataset.resolve()
    if not dataset_dir.is_dir():
        raise SystemExit(f"Dataset directory not found: {dataset_dir}")

    payload = run_evaluation(
        dataset_dir,
        threshold=args.threshold,
        auto_impostor=args.auto_impostor,
        max_impostor_pairs=args.max_impostor_pairs,
    )

    print(format_metrics(payload["metrics"]))
    print(f"\nSkipped (no face): {payload['skipped']}")
    out = save_results("face_metrics.json", payload)
    print(f"Results saved to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
