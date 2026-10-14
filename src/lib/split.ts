import type { CandidateRow, SplitResult } from './types';
import { mulberry32, shuffle } from './prng';

const NON_FEATURE_COLS = new Set([
  'candidate_id',
  'group_id',
  'coordX',
  'coordY',
  'coordZ',
  'label',
  'patch_voxels',
]);

export function groupedSplit(
  rows: CandidateRow[],
  seed: number = 42,
  trainRatio: number = 0.8
): SplitResult {
  if (!Number.isFinite(seed)) {
    throw new Error('Split seed must be a finite number.');
  }

  if (
    !Number.isFinite(trainRatio) ||
    trainRatio <= 0 ||
    trainRatio >= 1
  ) {
    throw new Error('trainRatio must be between 0 and 1.');
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Cannot split an empty dataset.');
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row.group_id || !row.group_id.trim()) {
      throw new Error(`Row ${i + 1}: group_id cannot be empty.`);
    }

    if (row.label !== 0 && row.label !== 1) {
      throw new Error(`Row ${i + 1}: label must be 0 or 1.`);
    }
  }

  const groups = [...new Set(rows.map((row) => row.group_id))];

  if (groups.length < 2) {
    throw new Error(
      'At least two distinct groups are required for a grouped train/test split.'
    );
  }

  const rng = mulberry32(seed);
  const shuffledGroups = shuffle([...groups], rng);

  const trainCount = Math.floor(
    shuffledGroups.length * trainRatio
  );

  if (trainCount < 1 || trainCount >= shuffledGroups.length) {
    throw new Error(
      'Not enough groups to create non-empty train and test sets.'
    );
  }

  const trainGroups = new Set(
    shuffledGroups.slice(0, trainCount)
  );

  const testGroups = new Set(
    shuffledGroups.slice(trainCount)
  );

  const trainRows: CandidateRow[] = [];
  const testRows: CandidateRow[] = [];

  for (const row of rows) {
    if (trainGroups.has(row.group_id)) {
      trainRows.push(row);
    } else if (testGroups.has(row.group_id)) {
      testRows.push(row);
    }
  }

  const overlapCount = [...trainGroups].filter(
    (group) => testGroups.has(group)
  ).length;

  if (overlapCount !== 0) {
    throw new Error('Group overlap detected in train/test split.');
  }

  const featureNames = Object.keys(rows[0]).filter((key) => {
    if (NON_FEATURE_COLS.has(key)) {
      return false;
    }

    return rows.every((row) => {
      const value = row[key];

      return (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        Number.isFinite(Number(value))
      );
    });
  });

  if (featureNames.length === 0) {
    throw new Error(
      'No valid numeric feature columns were found.'
    );
  }

  const hasBothClasses = (subset: CandidateRow[]) => {
    const labels = new Set(subset.map((row) => row.label));
    return labels.has(0) && labels.has(1);
  };

  if (!hasBothClasses(trainRows)) {
    throw new Error(
      'Training split does not contain both classes. Try another seed or review group-level class distribution.'
    );
  }

  if (!hasBothClasses(testRows)) {
    throw new Error(
      'Test split does not contain both classes. Try another seed or review group-level class distribution.'
    );
  }

  return {
    trainRows,
    testRows,
    trainGroups: [...trainGroups],
    testGroups: [...testGroups],
    overlapCount,
    featureNames,
  };
}
