import type { CandidateRow } from './types';

export interface Standardizer {
  mean: number[];
  std: number[];
}

export function fitStandardizer(rows: CandidateRow[], featureNames: string[]): Standardizer {
  const n = rows.length;
  if (n === 0) return { mean: [], std: [] };
  const mean = new Array(featureNames.length).fill(0);
  for (const row of rows) {
    for (let i = 0; i < featureNames.length; i++) {
      mean[i] += Number(row[featureNames[i]]);
    }
  }
  for (let i = 0; i < mean.length; i++) mean[i] /= n;

  const std = new Array(featureNames.length).fill(0);
  for (const row of rows) {
    for (let i = 0; i < featureNames.length; i++) {
      std[i] += (Number(row[featureNames[i]]) - mean[i]) ** 2;
    }
  }
  for (let i = 0; i < std.length; i++) {
    std[i] = Math.sqrt(std[i] / n);
    if (std[i] === 0) std[i] = 1;
  }
  return { mean, std };
}

export function standardizeRow(row: CandidateRow, featureNames: string[], std: Standardizer): number[] {
  return featureNames.map((f, i) => (Number(row[f]) - std.mean[i]) / std.std[i]);
}

export function standardizeMatrix(rows: CandidateRow[], featureNames: string[], std: Standardizer): number[][] {
  return rows.map((row) => standardizeRow(row, featureNames, std));
}

export interface LogisticRegressionModel {
  weights: number[];
  bias: number;
  featureNames: string[];
  standardizer: Standardizer;
  standardizedCoefficients: { feature: string; coefficient: number }[];
}

export function sigmoid(z: number): number {
  if (z < -500) return 0;
  if (z > 500) return 1;
  return 1 / (1 + Math.exp(-z));
}

export function trainLogisticRegression(
  rows: CandidateRow[],
  labels: number[],
  featureNames: string[],
  standardizer: Standardizer,
  options: { lr?: number; epochs?: number; l2?: number; classWeight?: number } = {}
): LogisticRegressionModel {
  const lr = options.lr ?? 0.01;
  const epochs = options.epochs ?? 500;
  const l2 = options.l2 ?? 0.001;

  const X = standardizeMatrix(rows, featureNames, standardizer);
  const n = X.length;
  const d = featureNames.length;

  const posCount = labels.filter((l) => l === 1).length;
  const negCount = n - posCount;
  const posWeight = n / (2 * Math.max(posCount, 1));
  const negWeight = n / (2 * Math.max(negCount, 1));

  const weights = new Array(d).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;
    for (let i = 0; i < n; i++) {
      const z = bias + dot(weights, X[i]);
      const pred = sigmoid(z);
      const err = pred - labels[i];
      const cw = labels[i] === 1 ? posWeight : negWeight;
      for (let j = 0; j < d; j++) {
        gradW[j] += err * cw * X[i][j];
      }
      gradB += err * cw;
    }
    for (let j = 0; j < d; j++) {
      weights[j] -= lr * (gradW[j] / n + l2 * weights[j]);
    }
    bias -= lr * (gradB / n);
  }

  const standardizedCoefficients = featureNames.map((f, i) => ({
    feature: f,
    coefficient: weights[i],
  }));

  return { weights, bias, featureNames, standardizer, standardizedCoefficients };
}

export function predictLogistic(model: LogisticRegressionModel, row: CandidateRow): { pred: number; prob: number } {
  const x = standardizeRow(row, model.featureNames, model.standardizer);
  const z = model.bias + dot(model.weights, x);
  const prob = sigmoid(z);
  return { pred: prob >= 0.5 ? 1 : 0, prob };
}

export function predictLogisticBatch(model: LogisticRegressionModel, rows: CandidateRow[]): { preds: number[]; probs: number[] } {
  const preds: number[] = [];
  const probs: number[] = [];
  for (const row of rows) {
    const r = predictLogistic(model, row);
    preds.push(r.pred);
    probs.push(r.prob);
  }
  return { preds, probs };
}

export interface DecisionTree {
  feature: number;
  threshold: number;
  left: DecisionTree | null;
  right: DecisionTree | null;
  prediction: number;
  isLeaf: boolean;
}

export interface RandomForestModel {
  trees: DecisionTree[];
  featureNames: string[];
  standardizer: Standardizer;
  featureImportances: { feature: string; importance: number }[];
  nTrees: number;
  maxDepth: number;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function gini(labels: number[], weights: number[]): number {
  let posW = 0;
  let totalW = 0;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === 1) posW += weights[i];
    totalW += weights[i];
  }
  if (totalW === 0) return 0;
  const p = posW / totalW;
  return 1 - p * p - (1 - p) * (1 - p);
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
  const posCount = labels.filter((l) => l === 1).length;
  const leafPred = posCount > labels.length - posCount ? 1 : 0;

  if (depth >= maxDepth || labels.length < 2 || posCount === 0 || posCount === labels.length) {
    return { feature: -1, threshold: 0, left: null, right: null, prediction: leafPred, isLeaf: true };
  }

  let bestGini = Infinity;
  let bestFeature = -1;
  let bestThreshold = 0;
  const parentGini = gini(labels, weights);

  for (const fi of featureIndices) {
    const values = X.map((row) => row[fi]).sort((a, b) => a - b);
    const uniqueVals = [...new Set(values)];
    for (let t = 0; t < uniqueVals.length - 1; t++) {
      const threshold = (uniqueVals[t] + uniqueVals[t + 1]) / 2;
      const leftLabels: number[] = [];
      const rightLabels: number[] = [];
      const leftWeights: number[] = [];
      const rightWeights: number[] = [];
      for (let i = 0; i < X.length; i++) {
        if (X[i][fi] <= threshold) {
          leftLabels.push(labels[i]);
          leftWeights.push(weights[i]);
        } else {
          rightLabels.push(labels[i]);
          rightWeights.push(weights[i]);
        }
      }
      if (leftLabels.length === 0 || rightLabels.length === 0) continue;

      const leftGini = gini(leftLabels, leftWeights);
      const rightGini = gini(rightLabels, rightWeights);
      const leftW = leftWeights.reduce((a, b) => a + b, 0);
      const rightW = rightWeights.reduce((a, b) => a + b, 0);
      const totalW = leftW + rightW;
      const weightedGini = (leftW / totalW) * leftGini + (rightW / totalW) * rightGini;

      if (weightedGini < bestGini) {
        bestGini = weightedGini;
        bestFeature = fi;
        bestThreshold = threshold;
      }
    }
  }

  if (bestFeature === -1) {
    return { feature: -1, threshold: 0, left: null, right: null, prediction: leafPred, isLeaf: true };
  }

  importances[bestFeature] += parentGini - bestGini;

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

  return {
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildTree(leftX, leftLabels, leftWeights, featureIndices, depth + 1, maxDepth, importances),
    right: buildTree(rightX, rightLabels, rightWeights, featureIndices, depth + 1, maxDepth, importances),
    prediction: leafPred,
    isLeaf: false,
  };
}

function predictTree(tree: DecisionTree, x: number[]): number {
  if (tree.isLeaf) return tree.prediction;
  if (x[tree.feature] <= tree.threshold) {
    return predictTree(tree.left!, x);
  } else {
    return predictTree(tree.right!, x);
  }
}

export function trainRandomForest(
  rows: CandidateRow[],
  labels: number[],
  featureNames: string[],
  standardizer: Standardizer,
  options: { nTrees?: number; maxDepth?: number; seed?: number; sampleRatio?: number } = {}
): RandomForestModel {
  const nTrees = options.nTrees ?? 30;
  const maxDepth = options.maxDepth ?? 8;
  const seed = options.seed ?? 42;
  const sampleRatio = options.sampleRatio ?? 1.0;

  const X = standardizeMatrix(rows, featureNames, standardizer);
  const n = X.length;
  const d = featureNames.length;

  const posCount = labels.filter((l) => l === 1).length;
  const negCount = n - posCount;
  const posWeight = n / (2 * Math.max(posCount, 1));
  const negWeight = n / (2 * Math.max(negCount, 1));
  const weights = labels.map((l) => (l === 1 ? posWeight : negWeight));

  const importances = new Array(d).fill(0);

  let rngState = seed >>> 0;
  const rng = () => {
    rngState = (rngState + 0x6d2b79f5) | 0;
    let t = rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const trees: DecisionTree[] = [];
  const sqrtD = Math.max(1, Math.floor(Math.sqrt(d)));

  for (let t = 0; t < nTrees; t++) {
    const sampleSize = Math.floor(n * sampleRatio);
    const indices: number[] = [];
    for (let i = 0; i < sampleSize; i++) {
      indices.push(Math.floor(rng() * n));
    }
    const sampleX = indices.map((i) => X[i]);
    const sampleLabels = indices.map((i) => labels[i]);
    const sampleWeights = indices.map((i) => weights[i]);

    const featureIndices: number[] = [];
    const allFeatureIndices = Array.from({ length: d }, (_, i) => i);
    for (let i = allFeatureIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allFeatureIndices[i], allFeatureIndices[j]] = [allFeatureIndices[j], allFeatureIndices[i]];
    }
    for (let i = 0; i < sqrtD; i++) {
      featureIndices.push(allFeatureIndices[i]);
    }

    trees.push(buildTree(sampleX, sampleLabels, sampleWeights, featureIndices, 0, maxDepth, importances));
  }

  const totalImportance = importances.reduce((a, b) => a + b, 0);
  const normalizedImportances = totalImportance > 0
    ? importances.map((v) => v / totalImportance)
    : importances.map(() => 1 / d);

  const featureImportances = featureNames.map((f, i) => ({
    feature: f,
    importance: normalizedImportances[i],
  }));

  return { trees, featureNames, standardizer, featureImportances, nTrees, maxDepth };
}

export function predictRandomForest(model: RandomForestModel, row: CandidateRow): { pred: number; prob: number } {
  const x = standardizeRow(row, model.featureNames, model.standardizer);
  let sum = 0;
  for (const tree of model.trees) {
    sum += predictTree(tree, x);
  }
  const prob = sum / model.trees.length;
  return { pred: prob >= 0.5 ? 1 : 0, prob };
}

export function predictRandomForestBatch(model: RandomForestModel, rows: CandidateRow[]): { preds: number[]; probs: number[] } {
  const preds: number[] = [];
  const probs: number[] = [];
  for (const row of rows) {
    const r = predictRandomForest(model, row);
    preds.push(r.pred);
    probs.push(r.prob);
  }
  return { preds, probs };
}
