import { describe, it, expect } from 'vitest';
import { parseCsv } from '@/lib/csv';

describe('parseCsv', () => {
  it('rejects missing required columns', () => {
    const csv = 'foo,bar\n1,2\n3,4';
    const result = parseCsv(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('candidate_id'))).toBe(true);
  });

  it('rejects non-numeric feature columns', () => {
    const csv = 'candidate_id,group_id,coordX,coordY,coordZ,label,bad_feature\n' +
      'c1,g1,1,2,3,1,abc\nc2,g1,4,5,6,0,def';
    const result = parseCsv(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('bad_feature'))).toBe(true);
  });

  it('accepts a valid CSV', () => {
    const csv = 'candidate_id,group_id,coordX,coordY,coordZ,label,mean_hu,std_hu\n' +
      'c1,g1,1,2,3,1,-500,30\nc2,g1,4,5,6,0,-300,50\nc3,g2,7,8,9,1,-400,40';
    const result = parseCsv(csv);
    expect(result.errors.length).toBe(0);
    expect(result.rows.length).toBe(3);
    expect(result.columns).toContain('mean_hu');
    expect(result.numericColumns).toContain('mean_hu');
  });

  it('handles empty CSV', () => {
    const result = parseCsv('');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('identifies numeric vs non-numeric columns', () => {
    const csv = 'candidate_id,group_id,coordX,coordY,coordZ,label,mean_hu\n' +
      'c1,g1,1,2,3,1,-500\nc2,g2,4,5,6,0,-300';
    const result = parseCsv(csv);
    expect(result.numericColumns).toContain('mean_hu');
    expect(result.numericColumns).toContain('coordX');
    expect(result.nonNumericColumns).toContain('candidate_id');
    expect(result.nonNumericColumns).toContain('group_id');
  });
});
