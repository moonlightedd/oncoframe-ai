import { describe, it, expect } from 'vitest';
import { groupBootstrap } from '@/lib/bootstrap';
import type { CandidateRow } from '@/lib/types';

function makeRows(nGroups: number, perGroup: number): CandidateRow[] {
  const rows: CandidateRow[] = [];
  for (let g = 0; g < nGroups; g++) {
    for (let c = 0; c < perGroup; c++) {
      rows.push({
        candidate_id: `c_${g}_${c}`,
        group_id: `g_${g}`,
        coordX: 0, coordY: 0, coordZ: 0,
        label: g % 2,
        mean_hu: g + c,
      });
    }
  }
  return rows;
}

describe('groupBootstrap', () => {
  it('is reproducible with the same seed', () => {
    const rows = makeRows(20, 3);
    const metricFn = (rs: CandidateRow[]) =>
      rs.reduce((a, r) => a + r.label, 0) / Math.max(rs.length, 1);
    const r1 = groupBootstrap(rows, metricFn, { nBoot: 100, seed: 42 });
    const r2 = groupBootstrap(rows, metricFn, { nBoot: 100, seed: 42 });
    expect(r1.mean).toBeCloseTo(r2.mean, 10);
    expect(r1.lower95).toBeCloseTo(r2.lower95, 10);
    expect(r1.upper95).toBeCloseTo(r2.upper95, 10);
  });

  it('produces different results with different seeds', () => {
    const rows = makeRows(20, 3);
    const metricFn = (rs: CandidateRow[]) =>
      rs.reduce((a, r) => a + r.label, 0) / Math.max(rs.length, 1);
    const r1 = groupBootstrap(rows, metricFn, { nBoot: 100, seed: 42 });
    const r2 = groupBootstrap(rows, metricFn, { nBoot: 100, seed: 999 });
    // They might coincidentally match, but it's very unlikely
    expect(r1.mean === r2.mean && r1.lower95 === r2.lower95).toBe(false);
  });

  it('returns mean within the CI range', () => {
    const rows = makeRows(15, 4);
    const metricFn = (rs: CandidateRow[]) =>
      rs.reduce((a, r) => a + r.label, 0) / Math.max(rs.length, 1);
    const r = groupBootstrap(rows, metricFn, { nBoot: 200, seed: 42 });
    expect(r.mean).toBeGreaterThanOrEqual(r.lower95);
    expect(r.mean).toBeLessThanOrEqual(r.upper95);
  });

  it('returns zeros for empty input', () => {
    const r = groupBootstrap([], () => 0, { nBoot: 10, seed: 42 });
    expect(r.mean).toBe(0);
    expect(r.lower95).toBe(0);
    expect(r.upper95).toBe(0);
  });
});
