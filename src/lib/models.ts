
import type { CandidateRow } from './types';

export interface Standardizer {
  mean: number[];
  std: number[];
}

export function fitStandardizer(
  rows: CandidateRow[],
  featureNames: string[]
): Standardizer {
  const n = rows.length;

  if (n === 0) {
    return {
      mean: new Array(featureNames.length).fill(0),
      std: new Array(featureNames.length).fill(1),
    };
  }

  const mean = new Array(featureNames.length).fill(0);

  for (const row of rows) {
    for (let i = 0; i < featureNames.length; i++) {
      const value = Number(row[featureNames[i]]);
      if (Number.isFinite(value)) {
        mean[i] += value;
      }
    }
  }

  for (let i = 0; i < mean.length; i++) {
    mean[i] /= n;
  }

  const std = new Array(featureNames.length).fill(0);

  for (const row of rows) {
    for (let i = 0; i < featureNames.length; i++) {
      const value = Number(row[featureNames[i]]);
      const safeValue = Number.isFinite(value) ? value : mean[i];
      std[i] += (safeValue - mean[i]) ** 2;
    }
  }

  for (let i = 0; i < std.length; i++) {
    std[i] = Math.sqrt(std[i] / n);

    if (!Number.isFinite(std[i]) || std[i] === 0) {
      std[i] = 1;
    }
  }

  return { mean, std };
}

export function standardizeRow(
  row: CandidateRow,
  featureNames: string[],
  standardizer: Standardizer
): number[] {
  return featureNames.map((feature, i) => {
    const value = Number(row[feature]);
    const safeValue = Number.isFinite(value)
      ? value
      : standardizer.mean[i] ?? 0;

    const mean = standardizer.mean[i] ?? 0;
    const std = standardizer.std[i] || 1;

    return (safeValue - mean) / std;
  });
}

export function standardizeMatrix(
  rows: CandidateRow[],
  featureNames: string[],
  standardizer: Standardizer
): number[][] {
  return rows.map((row) =>
    standardizeRow(row, featureNames, standardizer)
  );
}

// -----------------------------------------------------------------------------
// Logistic Regression
// -----------------------------------------------------------------------------

export interface LogisticRegressionModel {
  weights: number[];
  bias: number;
  featureNames: string[];
  standardizer: Standardizer;
  standardizedCoefficients: {
    feature: string;
    coefficient: number;
  }[];
}

export function sigmoid(z: number): number {
  if (z < -500) return 0;
  if (z > 500) return 1;

  return 1 / (1 + Math.exp(-z));
}

function dot(a: number[], b: number[]): number {
  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

export function trainLogisticRegression(
  rows: CandidateRow[],
  labels: number[],
  featureNames: string[],
  standardizer: Standardizer,
  options: {
    lr?: number;
    epochs?: number;
    l2?: number;
    classWeight?: number;
  } = {}
): LogisticRegressionModel {
  if (rows.length !== labels.length) {
    throw new Error('Rows and labels must have equal lengths.');
  }

  if (rows.length === 0 || featureNames.length === 0) {
    throw new Error('Training data and features must not be empty.');
  }

  if (!labels.every((label) => label === 0 || label === 1)) {
    throw new Error('Labels must be binary values 0 or 1.');
  }

  const lr = options.lr ?? 0.01;
  const epochs = options.epochs ?? 500;
  const l2 = options.l2 ?? 0.001;

  const X = standardizeMatrix(rows, featureNames, standardizer);
  const n = X.length;
  const d = featureNames.length;

  const posCount = labels.filter((label) => label === 1).length;
  const negCount = n - posCount;

  const posWeight =
    options.classWeight ?? n / (2 * Math.max(posCount, 1));

  const negWeight =
    options.classWeight ?? n / (2 * Math.max(negCount, 1));

  const weights = new Array(d).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const prediction = sigmoid(bias + dot(weights, X[i]));
      const error = prediction - labels[i];
      const classWeight = labels[i] === 1 ? posWeight : negWeight;

      for (let j = 0; j < d; j++) {
        gradW[j] += error * classWeight * X[i][j];
      }

      gradB += error * classWeight;
    }

    for (let j = 0; j < d; j++) {
      weights[j] -= lr * (gradW[j] / n + l2 * weights[j]);
    }

    bias -= lr * (gradB / n);
  }

  const standardizedCoefficients = featureNames.map((feature, i) => ({
    feature,
    coefficient: weights[i],
  }));

  return {
    weights,
    bias,
    featureNames,
    standardizer,
    standardizedCoefficients,
  };
}

export function predictLogistic(
  model: LogisticRegressionModel,
  row: CandidateRow
): { pred: number; prob: number } {
  const x = standardizeRow(
    row,
    model.featureNames,
    model.standardizer
  );

  const prob = sigmoid(model.bias + dot(model.weights, x));

  return {
    pred: prob >= 0.5 ? 1 : 0,
    prob,
  };
}

export function predictLogisticBatch(
  model: LogisticRegressionModel,
  rows: CandidateRow[]
): { preds: number[]; probs: number[] } {
  const preds: number[] = [];
  const probs: number[] = [];

  for (const row of rows) {
    const result = predictLogistic(model, row);
    preds.push(result.pred);
    probs.push(result.prob);
  }

  return { preds, probs };
}

// -----------------------------------------------------------------------------
// Random Forest
// -----------------------------------------------------------------------------

export interface DecisionTree {
  feature: number;
  threshold: number;
  left: DecisionTree | null;
  right: DecisionTree | null;

  // Leaf values are positive-class scores between 0 and 1.
  prediction: number;

  isLeaf: boolean;
}

export interface RandomForestModel {
  trees: DecisionTree[];
  featureNames: string[];
  standardizer: Standardizer;
  featureImportances: {
    feature: string;
    importance: number;
  }[];
  nTrees: number;
  maxDepth: number;
}

function giniFromWeights(
  positiveWeight: number,
  negativeWeight: number
): number {
  const total = positiveWeight + negativeWeight;

  if (total <= 0) return 0;

  const p = positiveWeight / total;

  return 2 * p * (1 - p);
}

function makeLeaf(
  positiveWeight: number,
  negativeWeight: number
): DecisionTree {
  const totalWeight = positiveWeight + negativeWeight;

  const prediction =
    totalWeight > 0 ? positiveWeight / totalWeight : 0;

  return {
    feature: -1,
    threshold: 0,
    left: null,
    right: null,
    prediction,
    isLeaf: true,
  };
}

function buildTree(
  X: number[][],
  labels: number[],
  weights: number[],
  featureIndices: number[],
  depth: number,
  maxDepth: number,
  importances: number[]
): DecisionTree {
  let positiveWeight = 0;
  let negativeWeight = 0;

  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === 1) {
      positiveWeight += weights[i];
    } else {
      negativeWeight += weights[i];
    }
  }

  const leaf = makeLeaf(positiveWeight, negativeWeight);

  if (
    depth >= maxDepth ||
    labels.length < 2 ||
    positiveWeight === 0 ||
    negativeWeight === 0 ||
    featureIndices.length === 0
  ) {
    return leaf;
  }

  const parentGini = giniFromWeights(
    positiveWeight,
    negativeWeight
  );

  let bestImpurity = Infinity;
  let bestFeature = -1;
  let bestThreshold = 0;

  for (const featureIndex of featureIndices) {
    const sorted = X.map((row, i) => ({
      value: row[featureIndex],
      label: labels[i],
      weight: weights[i],
    })).sort((a, b) => a.value - b.value);

    let leftPositive = 0;
    let leftNegative = 0;

    let rightPositive = positiveWeight;
    let rightNegative = negativeWeight;

    for (let i = 0; i < sorted.length - 1; i++) {
      const item = sorted[i];

      if (item.label === 1) {
        leftPositive += item.weight;
        rightPositive -= item.weight;
      } else {
        leftNegative += item.weight;
        rightNegative -= item.weight;
      }

      const next = sorted[i + 1];

      if (item.value === next.value) continue;

      const leftWeight = leftPositive + leftNegative;
      const rightWeight = rightPositive + rightNegative;
      const totalWeight = leftWeight + rightWeight;

      if (leftWeight <= 0 || rightWeight <= 0 || totalWeight <= 0) {
        continue;
      }

      const impurity =
        (leftWeight / totalWeight) *
          giniFromWeights(leftPositive, leftNegative) +
        (rightWeight / totalWeight) *
          giniFromWeights(rightPositive, rightNegative);

      if (impurity < bestImpurity) {
        bestImpurity = impurity;
        bestFeature = featureIndex;

        bestThreshold =
          item.value + (next.value - item.value) / 2;
      }
    }
  }

  if (bestFeature === -1 || bestImpurity >= parentGini) {
    return leaf;
  }

  importances[bestFeature] += Math.max(
    0,
    parentGini - bestImpurity
  );

  const leftX: number[][] = [];
  const rightX: number[][] = [];

  const leftLabels: number[] = [];
  const rightLabels: number[] = [];

  const leftWeights: number[] = [];
  const rightWeights: number[] = [];

  for (let i = 0; i < X.length; i++) {
    if (X[i][bestFeature] <= bestThreshold) {
      leftX.push(X[i]);
      leftLabels.push(labels[i]);
      leftWeights.push(weights[i]);
    } else {
      rightX.push(X[i]);
      rightLabels.push(labels[i]);
      rightWeights.push(weights[i]);
    }
  }

  if (leftX.length === 0 || rightX.length === 0) {
    return leaf;
  }

  return {
    feature: bestFeature,
    threshold: bestThreshold,

    left: buildTree(
      leftX,
      leftLabels,
      leftWeights,
      featureIndices,
      depth + 1,
      maxDepth,
      importances
    ),

    right: buildTree(
      rightX,
      rightLabels,
      rightWeights,
      featureIndices,
      depth + 1,
      maxDepth,
      importances
    ),

    prediction: leaf.prediction,
    isLeaf: false,
  };
}

function predictTree(tree: DecisionTree, x: number[]): number {
  if (tree.isLeaf) {
    return tree.prediction;
  }

  if (x[tree.feature] <= tree.threshold) {
    return predictTree(tree.left!, x);
  }

  return predictTree(tree.right!, x);
}

export function trainRandomForest(
  rows: CandidateRow[],
  labels: number[],
  featureNames: string[],
  standardizer: Standardizer,
  options: {
    nTrees?: number;
    maxDepth?: number;
    seed?: number;
    sampleRatio?: number;
  } = {}
): RandomForestModel {
  if (rows.length !== labels.length) {
    throw new Error('Rows and labels must have equal lengths.');
  }

  if (rows.length === 0 || featureNames.length === 0) {
    throw new Error('Training data and features must not be empty.');
  }

  if (!labels.every((label) => label === 0 || label === 1)) {
    throw new Error('Labels must be binary values 0 or 1.');
  }

  const nTrees = options.nTrees ?? 30;
  const maxDepth = options.maxDepth ?? 8;
  const seed = options.seed ?? 42;
  const sampleRatio = options.sampleRatio ?? 1;

  if (nTrees < 1 || maxDepth < 1 || sampleRatio <= 0) {
    throw new Error(
      'nTrees and maxDepth must be positive; sampleRatio must be greater than zero.'
    );
  }

  const X = standardizeMatrix(rows, featureNames, standardizer);
  const n = X.length;
  const d = featureNames.length;

  const posCount = labels.filter((label) => label === 1).length;
  const negCount = n - posCount;

  // Inverse-frequency class weights are calculated from training data only.
  const posWeight = n / (2 * Math.max(posCount, 1));
  const negWeight = n / (2 * Math.max(negCount, 1));

  const weights = labels.map((label) =>
    label === 1 ? posWeight : negWeight
  );

  const importances = new Array(d).fill(0);
  let rngState = seed >>> 0;

  const rng = (): number => {
    rngState = (rngState + 0x6d2b79f5) | 0;

    let t = rngState;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const trees: DecisionTree[] = [];

  const featureCount = Math.max(1, Math.floor(Math.sqrt(d)));
  const sampleSize = Math.max(
    1,
    Math.floor(n * sampleRatio)
  );

  for (let t = 0; t < nTrees; t++) {
    const indices: number[] = [];

    // Bootstrap sampling: rows may be selected more than once.
    for (let i = 0; i < sampleSize; i++) {
      indices.push(Math.floor(rng() * n));
    }

    const sampleX = indices.map((i) => X[i]);
    const sampleLabels = indices.map((i) => labels[i]);
    const sampleWeights = indices.map((i) => weights[i]);

    const allFeatureIndices = Array.from(
      { length: d },
      (_, i) => i
    );

    // Random feature subset for each tree.
    for (let i = allFeatureIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));

      [
        allFeatureIndices[i],
        allFeatureIndices[j],
      ] = [
        allFeatureIndices[j],
        allFeatureIndices[i],
      ];
    }

    const featureIndices = allFeatureIndices.slice(
      0,
      featureCount
    );

    trees.push(
      buildTree(
        sampleX,
        sampleLabels,
        sampleWeights,
        featureIndices,
        0,
        maxDepth,
        importances
      )
    );
  }

  const totalImportance = importances.reduce(
    (sum, value) => sum + value,
    0
  );

  const normalizedImportances =
    totalImportance > 0
      ? importances.map((value) => value / totalImportance)
      : importances.map(() => (d > 0 ? 1 / d : 0));

  const featureImportances = featureNames.map((feature, i) => ({
    feature,
    importance: normalizedImportances[i],
  }));

  return {
    trees,
    featureNames,
    standardizer,
    featureImportances,
    nTrees,
    maxDepth,
  };
}

export function predictRandomForest(
  model: RandomForestModel,
  row: CandidateRow
): { pred: number; prob: number } {
  const x = standardizeRow(
    row,
    model.featureNames,
    model.standardizer
  );

  if (model.trees.length === 0) {
    return { pred: 0, prob: 0 };
  }

  let probabilitySum = 0;

  for (const tree of model.trees) {
    probabilitySum += predictTree(tree, x);
  }

  const prob = probabilitySum / model.trees.length;

  return {
    pred: prob >= 0.5 ? 1 : 0,
    prob,
  };
}

export function predictRandomForestBatch(
  model: RandomForestModel,
  rows: CandidateRow[]
): { preds: number[]; probs: number[] } {
  const preds: number[] = [];
  const probs: number[] = [];

  for (const row of rows) {
    const result = predictRandomForest(model, row);

    preds.push(result.pred);
    probs.push(result.prob);
  }

  return { preds, probs };
}
