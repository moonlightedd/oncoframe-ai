import Papa from 'papaparse';
import type { CandidateRow, ParsedCsv } from './types';

const REQUIRED_COLUMNS = [
  'candidate_id',
  'group_id',
  'coordX',
  'coordY',
  'coordZ',
  'label',
];

const NON_FEATURE_COLUMNS = new Set([
  'candidate_id',
  'group_id',
  'coordX',
  'coordY',
  'coordZ',
  'label',
]);

export function parseCsv(text: string): ParsedCsv {
  const errors: string[] = [];

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => header.trim(),
  });

  const columns = result.meta.fields ?? [];

  if (columns.length === 0) {
    errors.push('CSV appears to be empty or has no header row.');
    return {
      rows: [],
      columns,
      numericColumns: [],
      nonNumericColumns: [],
      errors,
    };
  }

  if (result.errors.length > 0) {
    errors.push(
      ...result.errors.map(
        (error) => `CSV parsing error: ${error.message}`
      )
    );
  }

  for (const required of REQUIRED_COLUMNS) {
    if (!columns.includes(required)) {
      errors.push(`Missing required column: "${required}".`);
    }
  }

  if (errors.length > 0) {
    return {
      rows: [],
      columns,
      numericColumns: [],
      nonNumericColumns: [],
      errors,
    };
  }

  const rows = result.data as Record<string, string>[];

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
      const value = row[col]?.trim();

      if (value === undefined || value === '') {
        continue;
      }

      hasValue = true;

      if (!Number.isFinite(Number(value))) {
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

  const potentialFeatureCols = columns.filter(
    (col) => !NON_FEATURE_COLUMNS.has(col)
  );

  for (const col of potentialFeatureCols) {
    if (!numericColumns.includes(col)) {
      errors.push(
        `Feature column "${col}" is not fully numeric. ` +
        'All feature columns must contain numeric values.'
      );
    }
  }

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    for (const key of ['candidate_id', 'group_id']) {
      if (row[key] === undefined || row[key].trim() === '') {
        errors.push(
          `Row ${index + 2}: Missing required value "${key}".`
        );
      }
    }

    for (const key of ['coordX', 'coordY', 'coordZ', 'label']) {
      const value = row[key]?.trim();

      if (value === undefined || value === '') {
        errors.push(
          `Row ${index + 2}: Missing numeric value in "${key}".`
        );
        continue;
      }

      if (!Number.isFinite(Number(value))) {
        errors.push(
          `Row ${index + 2}: "${key}" must contain a finite number.`
        );
      }
    }

    const label = Number(row.label);

    if (
      row.label?.trim() !== '' &&
      row.label !== undefined &&
      (!Number.isFinite(label) || ![0, 1].includes(label))
    ) {
      errors.push(
        `Row ${index + 2}: label must be 0 or 1.`
      );
    }
  }

  if (errors.length > 0) {
    return {
      rows: [],
      columns,
      numericColumns,
      nonNumericColumns,
      errors,
    };
  }

  return {
    rows,
    columns,
    numericColumns,
    nonNumericColumns,
    errors,
  };
}

export function rowsToCandidates(
  rows: Record<string, string>[]
): CandidateRow[] {
  return rows.map((row, index) => {
    for (const key of REQUIRED_COLUMNS) {
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
      candidate_id: row.candidate_id.trim(),
      group_id: row.group_id.trim(),
      coordX: Number(row.coordX),
      coordY: Number(row.coordY),
      coordZ: Number(row.coordZ),
      label,
    } as CandidateRow;

    for (const key of Object.keys(row)) {
      if (key === 'candidate_id' || key === 'group_id') {
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

      if (key === 'label' && ![0, 1].includes(numericValue)) {
        throw new Error(
          `Row ${index + 2}: label must be 0 or 1.`
        );
      }

      if (key !== 'label') {
        (candidate as unknown as Record<string, string | number>)[key] =
          numericValue;
      }
    }

    return candidate;
  });
}

export function validateCsv(parsed: ParsedCsv): string[] {
  return parsed.errors;
}

export function findMissingValues(
  rows: Record<string, string>[],
  columns: string[]
): Record<string, number> {
  const missing: Record<string, number> = {};

  for (const col of columns) {
    missing[col] = 0;
  }

  for (const row of rows) {
    for (const col of columns) {
      const value = row[col];

      if (
        value === undefined ||
        value === '' ||
        value === null ||
        value.trim() === ''
      ) {
        missing[col]++;
      }
    }
  }

  return missing;
}

export function findDuplicateRows(
  rows: Record<string, string>[]
): number {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of rows) {
    const key = JSON.stringify(row);

    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}

export function getClassBalance(
  rows: Record<string, string>[]
): { positive: number; negative: number } {
  let positive = 0;
  let negative = 0;

  for (const row of rows) {
    const label = Number(row.label);

    if (label === 1) {
      positive++;
    } else if (label === 0) {
      negative++;
    }
  }

  return { positive, negative };
}

export function getRowsPerGroup(
  rows: Record<string, string>[]
): { group_id: string; count: number }[] {
  const groupCounts = new Map<string, number>();

  for (const row of rows) {
    const groupId = row.group_id;

    groupCounts.set(
      groupId,
      (groupCounts.get(groupId) ?? 0) + 1
    );
  }

  return Array.from(groupCounts.entries())
    .map(([group_id, count]) => ({ group_id, count }))
    .sort((a, b) => b.count - a.count);
}

export function getNumericSummaryStats(
  rows: Record<string, string>[],
  numericColumns: string[]
): {
  column: string;
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
}[] {
  return numericColumns.map((col) => {
    const values: number[] = [];

    for (const row of rows) {
      const rawValue = row[col]?.trim();

      if (rawValue === undefined || rawValue === '') {
        continue;
      }

      const value = Number(rawValue);

      if (Number.isFinite(value)) {
        values.push(value);
      }
    }

    if (values.length === 0) {
      return {
        column: col,
        mean: 0,
        std: 0,
        min: 0,
        max: 0,
        median: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean =
      values.reduce((sum, value) => sum + value, 0) /
      values.length;

    const variance =
      values.reduce(
        (sum, value) => sum + (value - mean) ** 2,
        0
      ) / values.length;

    const std = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const middle = Math.floor(sorted.length / 2);

    const median =
      sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];

    return {
      column: col,
      mean,
      std,
      min,
      max,
      median,
    };
  });
}
