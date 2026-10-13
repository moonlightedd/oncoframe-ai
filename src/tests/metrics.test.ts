import { describe, it, expect } from 'vitest';
import {
  confusionMatrix,
  accuracy,
  precision,
  recall,
  specificity,
  f1Score,
  rocAuc,
  brierScore,
  computeAllMetrics,
} from '@/lib/metrics';

describe('confusionMatrix', () => {
  it('matches hand-computed values', () => {
    const trues = [1, 1, 0, 0, 1, 0];
    const preds = [1, 0, 0, 1, 1, 0];
    const cm = confusionMatrix(trues, preds);
    expect(cm.tp).toBe(2);
    expect(cm.fp).toBe(1);
    expect(cm.tn).toBe(2);
    expect(cm.fn).toBe(1);
  });
});

describe('accuracy', () => {
  it('matches hand-computed value', () => {
    const trues = [1, 0, 1, 0];
    const preds = [1, 0, 0, 0];
    expect(accuracy(trues, preds)).toBe(0.75);
  });

  it('returns 0 for empty arrays', () => {
    expect(accuracy([], [])).toBe(0);
  });
});

describe('precision', () => {
  it('matches hand-computed value', () => {
    const cm = confusionMatrix([1, 0, 1], [1, 1, 0]);
    expect(precision(cm)).toBeCloseTo(0.5);
  });

  it('returns 0 when no positive predictions', () => {
    const cm = confusionMatrix([0, 0], [0, 0]);
    expect(precision(cm)).toBe(0);
  });
});

describe('recall', () => {
  it('matches hand-computed value', () => {
    const cm = confusionMatrix([1, 1, 0], [1, 0, 0]);
    expect(recall(cm)).toBeCloseTo(0.5);
  });
});

describe('specificity', () => {
  it('matches hand-computed value', () => {
    const cm = confusionMatrix([1, 0, 0], [1, 0, 1]);
    expect(specificity(cm)).toBeCloseTo(0.5);
  });
});

describe('f1Score', () => {
  it('matches hand-computed value', () => {
    const trues = [1, 1, 0, 0];
    const preds = [1, 0, 0, 0];
    const cm = confusionMatrix(trues, preds);
    const p = precision(cm);
    const r = recall(cm);
    const expected = (2 * p * r) / (p + r);
    expect(f1Score(cm)).toBeCloseTo(expected);
  });
});

describe('rocAuc', () => {
  it('returns 1 for perfect separation', () => {
    const trues = [0, 0, 1, 1];
    const probs = [0.1, 0.2, 0.8, 0.9];
    expect(rocAuc(trues, probs)).toBeCloseTo(1.0);
  });

  it('returns approximately 0.5 for uninformive scores', () => {
    const trues = [0, 1, 0, 1, 0, 1, 0, 1];
    const probs = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const auc = rocAuc(trues, probs);
    expect(auc).toBeCloseTo(0.5);
  });

  it('returns 0 for inverse separation', () => {
    const trues = [1, 1, 0, 0];
    const probs = [0.1, 0.2, 0.8, 0.9];
    expect(rocAuc(trues, probs)).toBeCloseTo(0.0);
  });
});

describe('brierScore', () => {
  it('matches hand-computed value', () => {
    const trues = [1, 0, 1];
    const probs = [0.9, 0.1, 0.8];
    const expected = ((0.9 - 1) ** 2 + (0.1 - 0) ** 2 + (0.8 - 1) ** 2) / 3;
    expect(brierScore(trues, probs)).toBeCloseTo(expected);
  });
});

describe('computeAllMetrics', () => {
  it('returns all expected fields', () => {
    const trues = [1, 0, 1, 0, 1, 0];
    const preds = [1, 0, 0, 0, 1, 0];
    const probs = [0.8, 0.2, 0.4, 0.3, 0.7, 0.1];
    const m = computeAllMetrics(trues, preds, probs);
    expect(m).toHaveProperty('accuracy');
    expect(m).toHaveProperty('precision');
    expect(m).toHaveProperty('recall');
    expect(m).toHaveProperty('specificity');
    expect(m).toHaveProperty('f1');
    expect(m).toHaveProperty('rocAuc');
    expect(m).toHaveProperty('prAuc');
    expect(m).toHaveProperty('brierScore');
    expect(m).toHaveProperty('confusionMatrix');
    expect(m).toHaveProperty('rocCurve');
    expect(m).toHaveProperty('prCurve');
  });
});
