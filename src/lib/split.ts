import type { CandidateRow, SplitResult } from './types';
import { mulberry32, shuffle } from './prng';

export function groupedSplit(
  rows: CandidateRow[],
  seed: number = 42,
  trainRatio: number = 0.8
): SplitResult {
  const rng = mulberry32(seed);
  const groupSet = new Set<string>();
  for (const row of rows) {
    groupSet.add(row.group_id);
  }
  const allGroups = Array.from(groupSet);
  const shuffledGroups = shuffle(allGroups, rng);

  const trainCount = Math.floor(shuffledGroups.length * trainRatio);
  const trainGroups = new Set(shuffledGroups.slice(0, trainCount));
  const testGroups = new Set(shuffledGroups.slice(trainCount));

  const trainRows: CandidateRow[] = [];
  const testRows: CandidateRow[] = [];

  for (const row of rows) {
    if (trainGroups.has(row.group_id)) {
      trainRows.push(row);
    } else {
      testRows.push(row);
    }
  }

  const overlap = Array.from(trainGroups).filter((g) => testGroups.has(g));

  const nonFeatureCols = new Set(['candidate_id', 'group_id', 'coordX', 'coordY', 'coordZ', 'label']);
  const featureNames = Object.keys(rows[0] ?? {}).filter((k) => !nonFeatureCols.has(k));

  return {
    trainRows,
    testRows,
    trainGroups: Array.from(trainGroups),
    testGroups: Array.from(testGroups),
    overlapCount: overlap.length,
    featureNames,
  };
}
