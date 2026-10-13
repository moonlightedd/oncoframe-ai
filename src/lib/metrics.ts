import type { ClassificationMetrics, ConfusionMatrix, CalibrationPoint } from './types';

export function confusionMatrix(trues: number[], preds: number[]): ConfusionMatrix {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < trues.length; i++) {
    if (trues[i] === 1 && preds[i] === 1) tp++;
    else if (trues[i] === 0 && preds[i] === 1) fp++;
    else if (trues[i] === 0 && preds[i] === 0) tn++;
    else fn++;
  }
  return { tp, fp, tn, fn };
}

export function accuracy(trues: number[], preds: number[]): number {
  if (trues.length === 0) return 0;
  let correct = 0;
  for (let i = 0; i < trues.length; i++) {
    if (trues[i] === preds[i]) correct++;
  }
  return correct / trues.length;
}

export function precision(cm: ConfusionMatrix): number {
  const denom = cm.tp + cm.fp;
  return denom === 0 ? 0 : cm.tp / denom;
}

export function recall(cm: ConfusionMatrix): number {
  const denom = cm.tp + cm.fn;
  return denom === 0 ? 0 : cm.tp / denom;
}

export function specificity(cm: ConfusionMatrix): number {
  const denom = cm.tn + cm.fp;
  return denom === 0 ? 0 : cm.tn / denom;
}

export function f1Score(cm: ConfusionMatrix): number {
  const p = precision(cm);
  const r = recall(cm);
  const denom = p + r;
  return denom === 0 ? 0 : (2 * p * r) / denom;
}

export function brierScore(trues: number[], probs: number[]): number {
  if (trues.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < trues.length; i++) {
    sum += (probs[i] - trues[i]) ** 2;
  }
  return sum / trues.length;
}

export function rocAuc(trues: number[], probs: number[]): number {
  const n = trues.length;
  if (n === 0) return 0;
  const pos = trues.filter((t) => t === 1).length;
  const neg = n - pos;
  if (pos === 0 || neg === 0) return 0;

  const pairs: { prob: number; true: number }[] = probs.map((p, i) => ({ prob: p, true: trues[i] }));
  pairs.sort((a, b) => b.prob - a.prob);

  let auc = 0;
  let cumPos = 0;
  let cumNeg = 0;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && pairs[j].prob === pairs[i].prob) j++;
    const groupPos = pairs.slice(i, j).filter((p) => p.true === 1).length;
    const groupNeg = j - i - groupPos;
    auc += cumPos * groupNeg + (groupPos * groupNeg) / 2;
    cumPos += groupPos;
    cumNeg += groupNeg;
    i = j;
  }
  return auc / (pos * neg);
}

export function computeRocCurve(trues: number[], probs: number[]): { fpr: number; tpr: number; threshold: number }[] {
  const pairs: { prob: number; true: number }[] = probs.map((p, i) => ({ prob: p, true: trues[i] }));
  pairs.sort((a, b) => b.prob - a.prob);

  const pos = trues.filter((t) => t === 1).length;
  const neg = trues.length - pos;
  if (pos === 0 || neg === 0) return [];

  const points: { fpr: number; tpr: number; threshold: number }[] = [];
  points.push({ fpr: 0, tpr: 0, threshold: Infinity });

  let tp = 0;
  let fp = 0;
  let i = 0;
  while (i < pairs.length) {
    let j = i;
    while (j < pairs.length && pairs[j].prob === pairs[i].prob) j++;
    for (let k = i; k < j; k++) {
      if (pairs[k].true === 1) tp++;
      else fp++;
    }
    points.push({
      fpr: fp / neg,
      tpr: tp / pos,
      threshold: pairs[i].prob,
    });
    i = j;
  }
  return points;
}

export function computePrCurve(trues: number[], probs: number[]): { precision: number; recall: number; threshold: number }[] {
  const pairs: { prob: number; true: number }[] = probs.map((p, i) => ({ prob: p, true: trues[i] }));
  pairs.sort((a, b) => b.prob - a.prob);

  const pos = trues.filter((t) => t === 1).length;
  if (pos === 0) return [];

  const points: { precision: number; recall: number; threshold: number }[] = [];
  points.push({ precision: 1, recall: 0, threshold: Infinity });

  let tp = 0;
  let fp = 0;
  let i = 0;
  while (i < pairs.length) {
    let j = i;
    while (j < pairs.length && pairs[j].prob === pairs[i].prob) j++;
    for (let k = i; k < j; k++) {
      if (pairs[k].true === 1) tp++;
      else fp++;
    }
    const denom = tp + fp;
    points.push({
      precision: denom === 0 ? 0 : tp / denom,
      recall: tp / pos,
      threshold: pairs[i].prob,
    });
    i = j;
  }
  return points;
}

export function prAuc(trues: number[], probs: number[]): number {
  const curve = computePrCurve(trues, probs);
  if (curve.length < 2) return 0;
  let area = 0;
  for (let i = 1; i < curve.length; i++) {
    const w = curve[i].recall - curve[i - 1].recall;
    const h = (curve[i].precision + curve[i - 1].precision) / 2;
    area += w * h;
  }
  return area;
}

export function calibrationPlot(
  trues: number[],
  probs: number[],
  nBins: number = 10
): CalibrationPoint[] {
  if (trues.length === 0) return [];
  const bins: { sums: number[]; counts: number[]; trueSums: number[] } = {
    sums: new Array(nBins).fill(0),
    counts: new Array(nBins).fill(0),
    trueSums: new Array(nBins).fill(0),
  };
  for (let i = 0; i < probs.length; i++) {
    const binIdx = Math.min(Math.floor(probs[i] * nBins), nBins - 1);
    bins.sums[binIdx] += probs[i];
    bins.counts[binIdx]++;
    bins.trueSums[binIdx] += trues[i];
  }
  const points: CalibrationPoint[] = [];
  for (let b = 0; b < nBins; b++) {
    if (bins.counts[b] === 0) continue;
    points.push({
      predictedBin: `${((b / nBins) * 100).toFixed(0)}-${(((b + 1) / nBins) * 100).toFixed(0)}%`,
      predictedProb: bins.sums[b] / bins.counts[b],
      observedProb: bins.trueSums[b] / bins.counts[b],
      count: bins.counts[b],
    });
  }
  return points;
}

export function computeAllMetrics(trues: number[], preds: number[], probs: number[]): ClassificationMetrics {
  const cm = confusionMatrix(trues, preds);
  return {
    accuracy: accuracy(trues, preds),
    precision: precision(cm),
    recall: recall(cm),
    specificity: specificity(cm),
    f1: f1Score(cm),
    rocAuc: rocAuc(trues, probs),
    prAuc: prAuc(trues, probs),
    brierScore: brierScore(trues, probs),
    confusionMatrix: cm,
    rocCurve: computeRocCurve(trues, probs),
    prCurve: computePrCurve(trues, probs),
  };
}
