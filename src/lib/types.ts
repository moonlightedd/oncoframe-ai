export interface CandidateRow {
  candidate_id: string;
  group_id: string;
  coordX: number;
  coordY: number;
  coordZ: number;
  label: number;
  [key: string]: string | number;
}

export interface ParsedCsv {
  rows: Record<string, string>[];
  columns: string[];
  numericColumns: string[];
  nonNumericColumns: string[];
  errors: string[];
}

export interface SplitResult {
  trainRows: CandidateRow[];
  testRows: CandidateRow[];
  trainGroups: string[];
  testGroups: string[];
  overlapCount: number;
  featureNames: string[];
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  rocAuc: number;
  prAuc: number;
  brierScore: number;
  confusionMatrix: ConfusionMatrix;
  rocCurve: { fpr: number; tpr: number; threshold: number }[];
  prCurve: { precision: number; recall: number; threshold: number }[];
}

export interface CalibrationPoint {
  predictedBin: string;
  predictedProb: number;
  observedProb: number;
  count: number;
}

export interface BootstrapResult {
  mean: number;
  lower95: number;
  upper95: number;
}

export interface ModelResult {
  modelName: string;
  predictions: number[];
  probabilities: number[];
  metrics: ClassificationMetrics;
  featureImportances?: { feature: string; importance: number }[];
  coefficients?: { feature: string; coefficient: number }[];
}

export interface ErrorRow {
  candidate_id: string;
  group_id: string;
  trueLabel: number;
  predictedLabel: number;
  probability: number;
  errorType: 'false_positive' | 'false_negative';
  features: Record<string, number>;
}

export interface FeatureBins {
  binLabel: string;
  count: number;
  falsePositives: number;
  falseNegatives: number;
  rangeStart: number;
  rangeEnd: number;
}
