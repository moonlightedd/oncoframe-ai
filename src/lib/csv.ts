import Papa from 'papaparse';
import type { CandidateRow, ParsedCsv } from './types';

const REQUIRED_COLUMNS = ['candidate_id', 'group_id', 'label'];

export function parseCsv(text: string): ParsedCsv {
  const errors: string[] = [];
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const columns = result.meta.fields ?? [];

  if (columns.length === 0) {
    errors.push('CSV appears to be empty or has no header row.');
    return { rows: [], columns, numericColumns: [], nonNumericColumns: [], errors };
  }

  for (const required of REQUIRED_COLUMNS) {
    if (!columns.includes(required)) {
      errors.push(`Missing required column: "${required}".`);
    }
  }

  if (errors.length > 0) {
    return { rows: [], columns, numericColumns: [], nonNumericColumns: [], errors };
  }

  const rows = result.data as Record<string, string>[];

  const nonFeatureCols = new Set(['candidate_id', 'group_id', 'coordX', 'coordY', 'coordZ', 'label']);
  const potentialFeatureCols = columns.filter((c) => !nonFeatureCols.has(c));

  const numericColumns: string[] = [];
  const nonNumericColumns: string[] = [];

  for (const col of columns) {
    if (col === 'candidate_id' || col === 'group_id') {
      nonNumericColumns.push(col);
      continue;
    }
    let allNumeric = true;
    let hasValue = false;
    for (const row of rows) {
      const val = row[col];
      if (val === undefined || val === '') continue;
      hasValue = true;
      if (isNaN(Number(val))) {
        allNumeric = false;
        break;
      }
    }
    if (allNumeric && hasValue) {
      numericColumns.push(col);
    } else {
      nonNumericColumns.push(col);
    }
  }

  for (const col of potentialFeatureCols) {
    if (!numericColumns.includes(col)) {
      errors.push(
        `Feature column "${col}" is not fully numeric. All feature columns must contain numeric values.`
      );
    }
  }

  if (errors.length > 0) {
    return { rows: [], columns, numericColumns, nonNumericColumns, errors };
  }

  return { rows, columns, numericColumns, nonNumericColumns, errors };
}


export function rowsToCandidates(rows: Record<string, string>[]): CandidateRow[] {
  return rows.map((row, index) => {
    const requiredValues = ['candidate_id', 'group_id', 'label'];

    for (const key of requiredValues) {
      if (row[key] === undefined || row[key].trim() === '') {
        throw new Error(
          `Row ${index + 2}: Missing required value "${key}".`
        );
      }
    }

    const label = Number(row.label);

    if (!Number.isFinite(label) || ![0, 1].includes(label)) {
      throw new Error(
        `Row ${index + 2}: label must be 0 or 1.`
      );
    }

    const candidate = {
      candidate_id: row.candidate_id,
      group_id: row.group_id,
      coordX: 0,
      coordY: 0,
      coordZ: 0,
      label,
    } as CandidateRow;

    for (const key of Object.keys(row)) {
      if (key === 'candidate_id' || key === 'group_id') {
        candidate[key] = row[key];
        continue;
      }

      const rawValue = row[key]?.trim();

      if (rawValue === undefined || rawValue === '') {
        throw new Error(
          `Row ${index + 2}: Missing numeric value in "${key}".`
        );
      }

      const numericValue = Number(rawValue);

      if (!Number.isFinite(numericValue)) {
        throw new Error(
          `Row ${index + 2}: "${key}" must contain a finite number.`
        );
      }

      candidate[key] = numericValue;
    }

    return candidate;
  });
}

export function validateCsv(parsed: ParsedCsv): string[] {
  return parsed.errors;
}

export function findMissingValues(rows: Record<string, string>[], columns: string[]): Record<string, number> {
  const missing: Record<string, number> = {};
  for (const col of columns) {
    missing[col] = 0;
  }
  for (const row of rows) {
    for (const col of columns) {
      const val = row[col];
      if (val === undefined || val === '' || val === null) {
        missing[col]++;
      }
    }
  }
  return missing;
}

export function findDuplicateRows(rows: Record<string, string>[]): number {
  const seen = new Set<string>();
  let dupes = 0;
  for (const row of rows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      dupes++;
    } else {
      seen.add(key);
    }
  }
  return dupes;
}

export function getClassBalance(rows: Record<string, string>[]): { positive: number; negative: number } {
  let positive = 0;
  let negative = 0;
  for (const row of rows) {
    const label = Number(row.label);
    if (label === 1) positive++;
    else negative++;
  }
  return { positive, negative };
}

export function getRowsPerGroup(rows: Record<string, string>[]): { group_id: string; count: number }[] {
  const groupCounts = new Map<string, number>();
  for (const row of rows) {
    const gid = row.group_id;
    groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1);
  }
  return Array.from(groupCounts.entries())
    .map(([group_id, count]) => ({ group_id, count }))
    .sort((a, b) => b.count - a.count);
}

export function getNumericSummaryStats(
  rows: Record<string, string>[],
  numericColumns: string[]
): { column: string; mean: number; std: number; min: number; max: number; median: number }[] {
  return numericColumns.map((col) => {
    const values: number[] = [];
    for (const row of rows) {
      const v = Number(row[col]);
      if (!isNaN(v)) values.push(v);
    }
    if (values.length === 0) {
      return { column: col, mean: 0, std: 0, min: 0, max: 0, median: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    return { column: col, mean, std, min, max, median };
  });
}
