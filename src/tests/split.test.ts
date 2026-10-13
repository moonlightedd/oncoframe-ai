import { describe, it, expect } from 'vitest';
import { groupedSplit } from '@/lib/split';
import type { CandidateRow } from '@/lib/types';

function makeRows(nGroups: number, perGroup: number): CandidateRow[] {
  const rows: CandidateRow[] = [];
  for (let g = 0; g < nGroups; g++) {
    for (let c = 0; c < perGroup; c++) {
      rows.push({
        candidate_id: `cand_${g}_${c}`,
        group_id: `group_${g}`,
        coordX: g,
        coordY: c,
        coordZ: 0,
        label: c % 2,
        mean_hu: g * 10 + c,
        std_hu: g + c,
      });
    }
  }
  return rows;
}

describe('groupedSplit', () => {
  it('produces zero overlap between train and test groups', () => {
    const rows = makeRows(20, 5);
    const split = groupedSplit(rows, 42, 0.8);
    expect(split.overlapCount).toBe(0);
  });

  it('puts every group in either train or test, never both', () => {
    const rows = makeRows(10, 3);
    const split = groupedSplit(rows, 42, 0.8);
    const trainSet = new Set(split.trainGroups);
    const testSet = new Set(split.testGroups);
    for (const g of trainSet) {
      expect(testSet.has(g)).toBe(false);
    }
    for (const g of testSet) {
      expect(trainSet.has(g)).toBe(false);
    }
  });

  it('assigns rows to the correct split based on group_id', () => {
    const rows = makeRows(10, 4);
    const split = groupedSplit(rows, 42, 0.8);
    const trainGroups = new Set(split.trainGroups);
    for (const row of split.trainRows) {
      expect(trainGroups.has(row.group_id)).toBe(true);
    }
    for (const row of split.testRows) {
      expect(trainGroups.has(row.group_id)).toBe(false);
    }
  });

  it('is deterministic with the same seed', () => {
    const rows = makeRows(15, 3);
    const s1 = groupedSplit(rows, 42, 0.8);
    const s2 = groupedSplit(rows, 42, 0.8);
    expect(s1.trainGroups).toEqual(s2.trainGroups);
    expect(s1.testGroups).toEqual(s2.testGroups);
  });

  it('produces approximately the requested ratio', () => {
    const rows = makeRows(100, 2);
    const split = groupedSplit(rows, 42, 0.8);
    const total = split.trainGroups.length + split.testGroups.length;
    const ratio = split.trainGroups.length / total;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(0.9);
  });
});
