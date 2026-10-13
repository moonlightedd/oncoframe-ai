
/// <reference lib="webworker" />

import type { CandidateRow, SplitResult, ModelResult } from '@/lib/types';

import {
  fitStandardizer,
  trainLogisticRegression,
  predictLogisticBatch,
  trainRandomForest,
  predictRandomForestBatch,
} from '@/lib/models';

import { groupedSplit } from '@/lib/split';
import { computeAllMetrics, calibrationPlot } from '@/lib/metrics';
import { groupBootstrap } from '@/lib/bootstrap';

export interface TrainRequest {
  candidates: CandidateRow[];
  seed: number;
}

type AccuracyBootstrapRow = CandidateRow & {
  isCorrect: number;
};

type RocBootstrapRow = CandidateRow & {
  bootstrapProbability: number;
};

export interface TrainResponse {
  split: SplitResult;
  results: ModelResult[];
  lrModel: ReturnType<typeof trainLogisticRegression>;
  rfModel: ReturnType<typeof trainRandomForest>;
  testRows: CandidateRow[];
  bootstrapCis: Record<
    string,
    Record<string, { mean: number; lower95: number; upper95: number }>
  >;
  calibrationData: {
    model: string;
    points: ReturnType<typeof calibrationPlot>;
  }[];
}

self.onmessage = (e: MessageEvent<TrainRequest>) => {
  try {
    const { candidates, seed } = e.data;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error('No candidate data provided.');
    }

    if (!Number.isFinite(seed)) {
      throw new Error('Training seed must be a finite number.');
    }

    self.postMessage({
      type: 'progress',
      progress: 5,
      status: 'Splitting data by CT scan group...',
    });

    const split = groupedSplit(candidates, seed, 0.8);

    if (split.trainRows.length === 0 || split.testRows.length === 0) {
      throw new Error('The train/test split produced an empty dataset.');
    }

    if (split.overlapCount !== 0) {
      throw new Error(
        'Group leakage detected: a CT scan group appears in both train and test sets.'
      );
    }

    const trainLabels = split.trainRows.map((row) => Number(row.label));
    const testLabels = split.testRows.map((row) => Number(row.label));

    const validBinaryLabels = (labels: number[]) =>
      labels.every((label) => label === 0 || label === 1);

    if (
      !validBinaryLabels(trainLabels) ||
      !validBinaryLabels(testLabels)
    ) {
      throw new Error('Labels must contain only binary values 0 and 1.');
    }

    if (
      !trainLabels.includes(0) ||
      !trainLabels.includes(1) ||
      !testLabels.includes(0) ||
      !testLabels.includes(1)
    ) {
      throw new Error(
        'Both labels (0 and 1) must appear in training and test sets. Review the group split or dataset.'
      );
    }

    self.postMessage({
      type: 'progress',
      progress: 15,
      status: 'Fitting standardizer on training data...',
    });

    // Fit preprocessing on training data only.
    const standardizer = fitStandardizer(
      split.trainRows,
      split.featureNames
    );

    self.postMessage({
      type: 'progress',
      progress: 25,
      status: 'Training Logistic Regression...',
    });

    const lrModel = trainLogisticRegression(
      split.trainRows,
      trainLabels,
      split.featureNames,
      standardizer,
      {
        lr: 0.05,
        epochs: 800,
        l2: 0.001,
      }
    );

    const lrPredictions = predictLogisticBatch(
      lrModel,
      split.testRows
    );

    self.postMessage({
      type: 'progress',
      progress: 50,
      status: 'Training Random Forest...',
    });

    const rfModel = trainRandomForest(
      split.trainRows,
      trainLabels,
      split.featureNames,
      standardizer,
      {
        nTrees: 40,
        maxDepth: 8,
        seed,
      }
    );

    const rfPredictions = predictRandomForestBatch(
      rfModel,
      split.testRows
    );

    self.postMessage({
      type: 'progress',
      progress: 70,
      status: 'Computing held-out evaluation metrics...',
    });

    const results: ModelResult[] = [
      {
        modelName: 'Logistic Regression',
        predictions: lrPredictions.preds,
        probabilities: lrPredictions.probs,
        metrics: computeAllMetrics(
          testLabels,
          lrPredictions.preds,
          lrPredictions.probs
        ),
        coefficients: [...lrModel.standardizedCoefficients].sort(
          (a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)
        ),
      },
      {
        modelName: 'Random Forest',
        predictions: rfPredictions.preds,
        probabilities: rfPredictions.probs,
        metrics: computeAllMetrics(
          testLabels,
          rfPredictions.preds,
          rfPredictions.probs
        ),
        featureImportances: [...rfModel.featureImportances].sort(
          (a, b) => b.importance - a.importance
        ),
      },
    ];

    self.postMessage({
      type: 'progress',
      progress: 80,
      status: 'Computing group-bootstrap confidence intervals...',
    });

    const bootstrapCis: TrainResponse['bootstrapCis'] = {};

    for (const result of results) {
      bootstrapCis[result.modelName] = {};

      // Store correctness separately without modifying true class labels.
      const accuracyRows: AccuracyBootstrapRow[] = split.testRows.map(
        (row, i) => ({
          ...row,
          isCorrect: Number(result.predictions[i] === testLabels[i]),
        })
      );

      bootstrapCis[result.modelName].accuracy = groupBootstrap(
        accuracyRows,
        (rows) => {
          if (rows.length === 0) return 0;

          return (
            rows.reduce((sum, row) => sum + Number(row.isCorrect), 0) /
            rows.length
          );
        },
        { nBoot: 300, seed }
      );

      // Preserve original labels for ROC-AUC calculation.
      const rocRows: RocBootstrapRow[] = split.testRows.map(
        (row, i) => ({
          ...row,
          bootstrapProbability: Number(result.probabilities[i]),
        })
      );

      bootstrapCis[result.modelName].rocAuc = groupBootstrap(
        rocRows,
        (rows) =>
          calculateAuc(
            rows.map((row) => Number(row.label)),
rows.map((row) => Number(row.bootstrapProbability))          ),
        { nBoot: 300, seed }
      );
    }

    self.postMessage({
      type: 'progress',
      progress: 90,
      status: 'Computing calibration plots...',
    });

    const calibrationData = [
      {
        model: 'Logistic Regression',
        points: calibrationPlot(testLabels, lrPredictions.probs),
      },
      {
        model: 'Random Forest',
        points: calibrationPlot(testLabels, rfPredictions.probs),
      },
    ];

    self.postMessage({
      type: 'progress',
      progress: 100,
      status: 'Done',
    });

    const response: TrainResponse = {
      split,
      results,
      lrModel,
      rfModel,
      testRows: split.testRows,
      bootstrapCis,
      calibrationData,
    };

    self.postMessage({
      type: 'done',
      data: response,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected training error occurred.';

    self.postMessage({
      type: 'error',
      message,
    });
  }
};

/**
 * ROC-AUC calculated using the Mann–Whitney U statistic.
 * Tied probability scores receive average ranks.
 */
function calculateAuc(
  labels: number[],
  probabilities: number[]
): number {
  if (
    labels.length !== probabilities.length ||
    labels.length === 0
  ) {
    return 0;
  }

  const pairs = probabilities
    .map((probability, index) => ({
      probability,
      label: Number(labels[index]),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.probability) &&
        (item.label === 0 || item.label === 1)
    );

  const positiveCount = pairs.filter(
    (item) => item.label === 1
  ).length;

  const negativeCount = pairs.filter(
    (item) => item.label === 0
  ).length;

  if (positiveCount === 0 || negativeCount === 0) {
    return 0;
  }

  pairs.sort((a, b) => a.probability - b.probability);

  let positiveRankSum = 0;
  let index = 0;

  while (index < pairs.length) {
    let end = index + 1;

    while (
      end < pairs.length &&
      pairs[end].probability === pairs[index].probability
    ) {
      end++;
    }

    // Ranks are 1-based, and tied scores receive average ranks.
    const averageRank = (index + 1 + end) / 2;

    let tiedPositiveCount = 0;

    for (let k = index; k < end; k++) {
      if (pairs[k].label === 1) {
        tiedPositiveCount++;
      }
    }

    positiveRankSum += tiedPositiveCount * averageRank;
    index = end;
  }

  const auc =
    (positiveRankSum -
      (positiveCount * (positiveCount + 1)) / 2) /
    (positiveCount * negativeCount);

  return Number.isFinite(auc)
    ? Math.max(0, Math.min(1, auc))
    : 0;
}
