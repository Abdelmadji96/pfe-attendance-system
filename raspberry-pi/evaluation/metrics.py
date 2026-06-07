"""TP / TN / FP / FN → Accuracy, Precision, Recall, F1, FAR, FRR."""

from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass
class ConfusionCounts:
    tp: int = 0
    tn: int = 0
    fp: int = 0
    fn: int = 0

    @property
    def total(self) -> int:
        return self.tp + self.tn + self.fp + self.fn


def update_counts(counts: ConfusionCounts, *, actual_positive: bool, predicted_positive: bool) -> None:
    if actual_positive and predicted_positive:
        counts.tp += 1
    elif actual_positive:
        counts.fn += 1
    elif predicted_positive:
        counts.fp += 1
    else:
        counts.tn += 1


def classification_metrics(counts: ConfusionCounts) -> dict[str, float | int]:
    total = counts.total
    precision_denom = counts.tp + counts.fp
    recall_denom = counts.tp + counts.fn
    far_denom = counts.fp + counts.tn
    frr_denom = counts.fn + counts.tp

    precision = counts.tp / precision_denom if precision_denom else 0.0
    recall = counts.tp / recall_denom if recall_denom else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall)
        else 0.0
    )

    return {
        "TP": counts.tp,
        "TN": counts.tn,
        "FP": counts.fp,
        "FN": counts.fn,
        "Accuracy": (counts.tp + counts.tn) / total if total else 0.0,
        "Precision": precision,
        "Recall": recall,
        "F1-Score": f1,
        "FAR": counts.fp / far_denom if far_denom else 0.0,
        "FRR": counts.fn / frr_denom if frr_denom else 0.0,
    }


def format_metrics(metrics: dict[str, float | int]) -> str:
    lines = [
        f"TP: {metrics['TP']}",
        f"TN: {metrics['TN']}",
        f"FP: {metrics['FP']}",
        f"FN: {metrics['FN']}",
        "",
        f"Accuracy : {metrics['Accuracy']:.6f}",
        f"Precision: {metrics['Precision']:.6f}",
        f"Recall   : {metrics['Recall']:.6f}",
        f"F1-Score : {metrics['F1-Score']:.6f}",
        f"FAR      : {metrics['FAR']:.6f}",
        f"FRR      : {metrics['FRR']:.6f}",
    ]
    return "\n".join(lines)


def metrics_payload(
    counts: ConfusionCounts,
    *,
    system: str,
    threshold: float | None = None,
) -> dict:
    payload = {
        "system": system,
        "counts": asdict(counts),
        "metrics": classification_metrics(counts),
    }
    if threshold is not None:
        payload["threshold"] = threshold
    return payload
