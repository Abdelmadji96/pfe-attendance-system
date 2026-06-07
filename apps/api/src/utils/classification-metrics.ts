export interface ConfusionCounts {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
}

export interface ClassificationMetrics {
  TP: number;
  TN: number;
  FP: number;
  FN: number;
  Accuracy: number;
  Precision: number;
  Recall: number;
  "F1-Score": number;
  FAR: number;
  FRR: number;
}

export function updateCounts(
  counts: ConfusionCounts,
  actualPositive: boolean,
  predictedPositive: boolean
): ConfusionCounts {
  const next = { ...counts };
  if (actualPositive && predictedPositive) next.tp += 1;
  else if (actualPositive) next.fn += 1;
  else if (predictedPositive) next.fp += 1;
  else next.tn += 1;
  return next;
}

export function classificationMetrics(counts: ConfusionCounts): ClassificationMetrics {
  const total = counts.tp + counts.tn + counts.fp + counts.fn;
  const precisionDenom = counts.tp + counts.fp;
  const recallDenom = counts.tp + counts.fn;
  const farDenom = counts.fp + counts.tn;
  const frrDenom = counts.fn + counts.tp;

  const precision = precisionDenom ? counts.tp / precisionDenom : 0;
  const recall = recallDenom ? counts.tp / recallDenom : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    TP: counts.tp,
    TN: counts.tn,
    FP: counts.fp,
    FN: counts.fn,
    Accuracy: total ? (counts.tp + counts.tn) / total : 0,
    Precision: precision,
    Recall: recall,
    "F1-Score": f1,
    FAR: farDenom ? counts.fp / farDenom : 0,
    FRR: frrDenom ? counts.fn / frrDenom : 0,
  };
}
