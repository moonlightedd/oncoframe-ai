
import type { CandidateRow, SplitResult } from './types';
import { mulberry32, shuffle } from './prng';

export function groupedSplit(
  rows: CandidateRow[],
  seed: number = 42,
  trainRatio: number = 0.8
): SplitResult {
  if (rows.length === 0) {
    return {
      trainRows: [],
      testRows: [],
      trainGroups: [],
      testGroups: [],
      overlapCount: 0,
      featureNames: [],
    };
  }

  const rng = mulberry32(seed);
  const groupSet = new Set<string>();

  for (const row of rows) {
    groupSet.add(row.group_id);
  }

  const shuffledGroups = shuffle(Array.from(groupSet), rng);
  const trainCount = Math.floor(shuffledGroups.length * trainRatio);

  const trainGroups = new Set(shuffledGroups.slice(0, trainCount));
  const testGroups = new Set(shuffledGroups.slice(trainCount));

  const trainRows: CandidateRow[] = [];
  const testRows: CandidateRow[] = [];

  for (const row of rows) {
    if (trainGroups.has(row.group_id)) {
      trainRows.push(row);
    } else if (testGroups.has(row.group_id)) {
      testRows.push(row);
    }
  }

  const nonFeatureCols = new Set([
    'candidate_id',
    'group_id',
    'coordX',
    'coordY',
    'coordZ',
    'label',
    'patch_voxels',
  ]);

  const featureNames = Object.keys(rows[0]).filter((key) => {
    if (nonFeatureCols.has(key)) return false;

    return rows.every((row) => {
      const value = Number(row[key]);
      return Number.isFinite(value);
    });
  });

  const overlapCount = [...trainGroups].filter((group) =>
    testGroups.has(group)
  ).length;

  return {
    trainRows,
    testRows,
    trainGroups: [...trainGroups],
    testGroups: [...testGroups],
    overlapCount,
    featureNames,
  };
}
