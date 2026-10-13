
import { describe, it, expect } from 'vitest';
import {
  fitStandardizer,
  trainRandomForest,
  predictRandomForestBatch,
} from '../lib/models';
import type { CandidateRow } from '../lib/types';

describe('Random Forest model', () => {
  it('should learn a simple separable binary dataset', () => {
    const rows: CandidateRow[] = [];

    for (let i = 0; i < 40; i++) {
      const label = i >= 20 ? 1 : 0;
      rows.push({
        candidate_id: `c${i}`,
        group_id: `g${i}`,
        coordX: i,
        coordY: i,
        coordZ: i,
        patch_mean_hu: label ? 100 + i : -100 - i,
        patch_std_hu: label ? 10 : 1,
        label,
      } as CandidateRow);
    }

    const featureNames = ['patch_mean_hu', 'patch_std_hu'];
    const labels = rows.map((r) => r.label);
    const standardizer = fitStandardizer(rows, featureNames);

    const model = trainRandomForest(
      rows,
      labels,
      featureNames,
      standardizer,
      { nTrees: 10, maxDepth: 4, seed: 42 }
    );

    const result = predictRandomForestBatch(model, rows);
    const correct = result.preds.filter((p, i) => p === labels[i]).length;

    expect(correct / labels.length).toBeGreaterThanOrEqual(0.9);
    expect(result.preds).toContain(1);
    expect(result.preds).toContain(0);
  });
});
