import type { CandidateRow } from './types';
import { mulberry32 } from './prng';

export function groupBootstrap(
  rows: CandidateRow[],
  metricFn: (rows: CandidateRow[]) => number,
  options: { nBoot?: number; seed?: number; ciLevel?: number } = {}
): { mean: number; lower95: number; upper95: number } {
  const nBoot = options.nBoot ?? 500;
  const seed = options.seed ?? 42;
  const ciLevel = options.ciLevel ?? 0.95;

  const groupSet = new Set<string>();
  for (const row of rows) {
    groupSet.add(row.group_id);
  }
  const allGroups = Array.from(groupSet);
  if (allGroups.length === 0) return { mean: 0, lower95: 0, upper95: 0 };

  const rowsByGroup = new Map<string, CandidateRow[]>();
  for (const row of rows) {
    const arr = rowsByGroup.get(row.group_id) ?? [];
    arr.push(row);
    rowsByGroup.set(row.group_id, arr);
  }

  const rng = mulberry32(seed);
  const metrics: number[] = [];

  for (let b = 0; b < nBoot; b++) {
    const sampledRows: CandidateRow[] = [];
    for (let i = 0; i < allGroups.length; i++) {
      const idx = Math.floor(rng() * allGroups.length);
      const group = allGroups[idx];
      sampledRows.push(...(rowsByGroup.get(group) ?? []));
    }
    metrics.push(metricFn(sampledRows));
  }

  metrics.sort((a, b) => a - b);
  const mean = metrics.reduce((a, b) => a + b, 0) / metrics.length;
  const alpha = 1 - ciLevel;
  const lowerIdx = Math.floor((alpha / 2) * metrics.length);
  const upperIdx = Math.floor((1 - alpha / 2) * metrics.length) - 1;
  return {
    mean,
    lower95: metrics[Math.max(0, lowerIdx)],
    upper95: metrics[Math.min(metrics.length - 1, upperIdx)],
  };
}
