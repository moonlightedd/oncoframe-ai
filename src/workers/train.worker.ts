/// <reference lib="webworker" />
import type { CandidateRow, SplitResult, ModelResult } from '@/lib/types';
import { groupedSplit } from '@/lib/split';
import {
  fitStandardizer,
  trainLogisticRegression,
  predictLogisticBatch,
  trainRandomForest,
  predictRandomForestBatch,
} from '@/lib/models';
import { computeAllMetrics, calibrationPlot } from '@/lib/metrics';
import { groupBootstrap } from '@/lib/bootstrap';

export interface TrainRequest {
  candidates: CandidateRow[];
  seed: number;
}

export interface TrainResponse {
  split: SplitResult;
  results: ModelResult[];
  lrModel: ReturnType<typeof trainLogisticRegression>;
  rfModel: ReturnType<typeof trainRandomForest>;
  testRows: CandidateRow[];
  bootstrapCis: Record<string, Record<string, { mean: number; lower95: number; upper95: number }>>;
  calibrationData: { model: string; points: ReturnType<typeof calibrationPlot> }[];
}

self.onmessage = (e: MessageEvent<TrainRequest>) => {
  const { candidates, seed } = e.data;

  (self as unknown as Worker).postMessage({ type: 'progress', progress: 5, status: 'Splitting data by group...' });

  const split = groupedSplit(candidates, seed, 0.8);

  (self as unknown as Worker).postMessage({ type: 'progress', progress: 15, status: 'Fitting standardizer on training data...' });

  const std = fitStandardizer(split.trainRows, split.featureNames);
  const trainLabels = split.trainRows.map((r) => r.label);
  const testLabels = split.testRows.map((r) => r.label);

  (self as unknown as Worker).postMessage({ type: 'progress', progress: 25, status: 'Training Logistic Regression...' });

  const lrModel = trainLogisticRegression(split.trainRows, trainLabels, split.featureNames, std, {
    lr: 0.05,
    epochs: 800,
    l2: 0.001,
  });
  const lrPreds = predictLogisticBatch(lrModel, split.testRows);

  (self as unknown as Worker).postMessage({ type: 'progress', progress: 50, status: 'Training Random Forest...' });

  const rfModel = trainRandomForest(split.trainRows, trainLabels, split.featureNames, std, {
    nTrees: 40,
    maxDepth: 8,
    seed,
  });
  const rfPreds = predictRandomForestBatch(rfModel, split.testRows);

  (self as unknown as Worker).postMessage({ type: 'progress', progress: 70, status: 'Computing metrics...' });

  const lrMetrics = computeAllMetrics(testLabels, lrPreds.preds, lrPreds.probs);
  const rfMetrics = computeAllMetrics(testLabels, rfPreds.preds, rfPreds.probs);

  const results: ModelResult[] = [
    {
      modelName: 'Logistic Regression',
      predictions: lrPreds.preds,
      probabilities: lrPreds.probs,
      metrics: lrMetrics,
      coefficients: lrModel.standardizedCoefficients.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)),
    },
    {
      modelName: 'Random Forest',
      predictions: rfPreds.preds,
      probabilities: rfPreds.probs,
      metrics: rfMetrics,
      featureImportances: rfModel.featureImportances.sort((a, b) => b.importance - a.importance),
    },
  ];

  (self as unknown as Worker).postMessage({ type: 'progress', progress: 80, status: 'Computing bootstrap CIs...' });

  const bootstrapCis: Record<string, Record<string, { mean: number; lower95: number; upper95: number }>> = {};

  for (const result of results) {
    bootstrapCis[result.modelName] = {};

    bootstrapCis[result.modelName].accuracy = groupBootstrap(
      split.testRows.map((r, i) => ({
        ...r,
        label: result.predictions[i] === testLabels[i] ? 1 : 0,
      })),
      (rows) => rows.reduce((a, r) => a + r.label, 0) / Math.max(rows.length, 1),
      { nBoot: 300, seed }
    );

    bootstrapCis[result.modelName].rocAuc = groupBootstrap(
      split.testRows.map((r, i) => ({
        ...r,
        label: r.label,
      })),
      (rows) => {
        const probs = rows.map((r) => {
          const idx = split.testRows.findIndex((tr) => tr.candidate_id === r.candidate_id);
          return idx >= 0 ? result.probabilities[idx] : 0.5;
        });
        const trues = rows.map((r) => r.label);
        return simpleAuc(trues, probs);
      },
      { nBoot: 300, seed }
    );
  }

  (self as unknown as Worker).postMessage({ type: 'progress', progress: 90, status: 'Computing calibration...' });

  const calibrationData = [
    { model: 'Logistic Regression', points: calibrationPlot(testLabels, lrPreds.probs) },
    { model: 'Random Forest', points: calibrationPlot(testLabels, rfPreds.probs) },
  ];

  (self as unknown as Worker).postMessage({ type: 'progress', progress: 100, status: 'Done' });

  const response: TrainResponse = {
    split,
    results,
    lrModel,
    rfModel,
    testRows: split.testRows,
    bootstrapCis,
    calibrationData,
  };

  (self as unknown as Worker).postMessage({ type: 'done', data: response });
};

function simpleAuc(trues: number[], probs: number[]): number {
  const n = trues.length;
  if (n === 0) return 0;
  const pos = trues.filter((t) => t === 1).length;
  const neg = n - pos;
  if (pos === 0 || neg === 0) return 0;
  const pairs = probs.map((p, i) => ({ prob: p, true: trues[i] }));
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
