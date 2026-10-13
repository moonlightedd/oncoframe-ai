import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { parseCsv, rowsToCandidates, findMissingValues, findDuplicateRows, getClassBalance, getRowsPerGroup, getNumericSummaryStats } from '@/lib/csv';
import { emptyAppData } from '@/lib/appTypes';
import PageWrapper from '@/components/PageWrapper';
import FileUpload from '@/components/FileUpload';
import EmptyState from '@/components/EmptyState';
import StatBox from '@/components/StatBox';
import { FileWarning, CheckCircle, AlertCircle, Info } from 'lucide-react';

const REQUIRED_ROWS = 5000;

export default function DatasetAudit() {
  const { data, setData } = useApp();
  const navigate = useNavigate();
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const handleCsvUpload = (text: string, filename: string) => {
    setParseErrors([]);
    const parsed = parseCsv(text);
    if (parsed.errors.length > 0) {
      setParseErrors(parsed.errors);
      return;
    }
    const candidates = rowsToCandidates(parsed.rows);
    setData((prev) => ({
      ...prev,
      ...emptyAppData,
      parsedCsv: parsed,
      rawRows: parsed.rows,
      candidates,
      columns: parsed.columns,
      numericColumns: parsed.numericColumns,
    }));
  };

  const handleDictionaryUpload = (text: string) => {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',');
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });
        return row;
      });
      const dict = rows.map((r) => ({
        column: r.column ?? r[headers[0]] ?? '',
        type: r.type ?? r[headers[1]] ?? '',
        description: r.description ?? r[headers[2]] ?? '',
        source: r.source ?? r[headers[3]] ?? '',
      }));
      setData((prev) => ({ ...prev, dataDictionary: dict }));
    } catch {
      // ignore parse errors for optional file
    }
  };

  const handleAuditUpload = (text: string) => {
    try {
      const audit = JSON.parse(text);
      setData((prev) => ({ ...prev, auditInfo: audit }));
    } catch {
      // ignore
    }
  };

  const hasData = data.candidates.length > 0;
  const rowCount = data.rawRows.length;
  const groupCount = new Set(data.rawRows.map((r) => r.group_id)).size;
  const { positive, negative } = getClassBalance(data.rawRows);
  const missing = findMissingValues(data.rawRows, data.columns);
  const duplicates = findDuplicateRows(data.rawRows);
  const rowsPerGroup = getRowsPerGroup(data.rawRows);
  const stats = getNumericSummaryStats(data.rawRows, data.numericColumns);
  const minGroupSize = rowsPerGroup.length > 0 ? rowsPerGroup[rowsPerGroup.length - 1].count : 0;
  const maxGroupSize = rowsPerGroup.length > 0 ? rowsPerGroup[0].count : 0;
  const imbalanceRatio = negative > 0 ? positive / negative : 0;
  const isSevereImbalance = imbalanceRatio < 0.1 || imbalanceRatio > 10;
  const meetsRowRequirement = rowCount >= REQUIRED_ROWS;

  return (
    <PageWrapper
      title="Dataset Audit"
      subtitle="Upload your features.csv to see dataset statistics. All processing happens in your browser."
    >
      {!hasData && parseErrors.length === 0 && (
        <div className="space-y-6">
          <FileUpload
            onFile={handleCsvUpload}
            label="Upload features.csv"
            hint="Required columns: candidate_id, group_id, coordX, coordY, coordZ, label, plus numeric feature columns"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              onFile={handleDictionaryUpload}
              accept=".csv"
              label="Upload data_dictionary.csv (optional)"
              hint="Columns: column, type, description, source"
              icon="csv"
            />
            <FileUpload
              onFile={handleAuditUpload}
              accept=".json"
              label="Upload audit.json (optional)"
              hint="File counts, row counts, license note"
              icon="json"
            />
          </div>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <FileWarning className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">CSV Validation Errors</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                {parseErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              <button
                className="btn-outline mt-4 text-sm"
                onClick={() => setParseErrors([])}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {hasData && (
        <div className="space-y-6">
          {/* Upload additional files */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!data.dataDictionary && (
              <FileUpload
                onFile={handleDictionaryUpload}
                accept=".csv"
                label="Upload data_dictionary.csv (optional)"
                icon="csv"
              />
            )}
            {!data.auditInfo && (
              <FileUpload
                onFile={handleAuditUpload}
                accept=".json"
                label="Upload audit.json (optional)"
                icon="json"
              />
            )}
          </div>

          {/* Row count check */}
          <div className={`card ${meetsRowRequirement ? 'border-teal-200' : 'border-amber-200'}`}>
            <div className="flex items-center gap-3">
              {meetsRowRequirement ? (
                <CheckCircle className="w-6 h-6 text-teal-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600" />
              )}
              <div>
                <p className="font-semibold text-navy-500">
                  Row Count Check: {rowCount.toLocaleString()} / {REQUIRED_ROWS.toLocaleString()} rows
                </p>
                <p className="text-sm text-gray-500">
                  {meetsRowRequirement
                    ? 'Dataset meets the 5,000-row minimum requirement.'
                    : `Dataset has ${rowCount.toLocaleString()} rows. The recommended minimum is ${REQUIRED_ROWS.toLocaleString()} rows. You may proceed, but results may be less reliable.`}
                </p>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="Total Rows" value={rowCount.toLocaleString()} sublabel="Candidates, not patients" />
            <StatBox label="Unique Groups" value={groupCount.toLocaleString()} sublabel="Scan/series IDs" color="teal" />
            <StatBox label="Positive (label=1)" value={positive.toLocaleString()} sublabel={`${(positive / rowCount * 100).toFixed(1)}%`} color="teal" />
            <StatBox label="Negative (label=0)" value={negative.toLocaleString()} sublabel={`${(negative / rowCount * 100).toFixed(1)}%`} />
          </div>

          {/* Class imbalance warning */}
          {isSevereImbalance && (
            <div className="card border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Severe Class Imbalance Detected</p>
                  <p className="text-sm text-amber-700 mt-1">
                    The positive-to-negative ratio is {imbalanceRatio.toFixed(3)}. Class weights will be applied during training to compensate.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Candidate vs patient note */}
          <div className="card bg-navy-50 border-navy-100">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-navy-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-navy-600">
                <strong>Rows are candidates, not independent patients.</strong> Multiple candidates may come from the same scan.
                Group-level splitting ensures no data leakage across train/test sets.
              </p>
            </div>
          </div>

          {/* Group statistics */}
          <div className="card">
            <h3 className="section-title">Rows per Group</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatBox label="Min / Group" value={minGroupSize} />
              <StatBox label="Max / Group" value={maxGroupSize} />
              <StatBox label="Mean / Group" value={(rowCount / Math.max(groupCount, 1)).toFixed(1)} color="teal" />
              <StatBox label="Median / Group" value={
                rowsPerGroup.length > 0
                  ? rowsPerGroup.length % 2 === 0
                    ? ((rowsPerGroup[rowsPerGroup.length / 2 - 1].count + rowsPerGroup[rowsPerGroup.length / 2].count) / 2).toFixed(1)
                    : rowsPerGroup[Math.floor(rowsPerGroup.length / 2)].count.toString()
                  : '0'
              } />
            </div>
            <div className="overflow-x-auto max-h-64 scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 px-3">Group ID</th>
                    <th className="py-2 px-3 text-right">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsPerGroup.slice(0, 100).map((g) => (
                    <tr key={g.group_id} className="border-b border-gray-100">
                      <td className="py-1.5 px-3 font-mono text-xs">{g.group_id}</td>
                      <td className="py-1.5 px-3 text-right">{g.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rowsPerGroup.length > 100 && (
                <p className="text-xs text-gray-400 text-center py-2">Showing first 100 of {rowsPerGroup.length} groups</p>
              )}
            </div>
          </div>

          {/* Missing values */}
          <div className="card">
            <h3 className="section-title">Missing Values per Column</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-3">Column</th>
                  <th className="py-2 px-3 text-right">Missing</th>
                  <th className="py-2 px-3 text-right">Missing %</th>
                </tr>
              </thead>
              <tbody>
                {data.columns.map((col) => {
                  const m = missing[col] ?? 0;
                  const pct = rowCount > 0 ? (m / rowCount * 100).toFixed(2) : '0';
                  return (
                    <tr key={col} className="border-b border-gray-100">
                      <td className="py-1.5 px-3 font-mono text-xs">{col}</td>
                      <td className="py-1.5 px-3 text-right">{m}</td>
                      <td className="py-1.5 px-3 text-right">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Duplicate rows */}
          <div className="card">
            <h3 className="section-title">Duplicate Row Check</h3>
            <p className={`text-sm ${duplicates > 0 ? 'text-amber-700' : 'text-teal-700'}`}>
              {duplicates > 0
                ? `${duplicates} duplicate row(s) detected. Rows are reported only — no rows are auto-created or deleted.`
                : 'No duplicate rows detected.'}
            </p>
          </div>

          {/* Numeric summary stats */}
          <div className="card">
            <h3 className="section-title">Numeric Summary Statistics</h3>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 px-3">Column</th>
                    <th className="py-2 px-3 text-right">Mean</th>
                    <th className="py-2 px-3 text-right">Std</th>
                    <th className="py-2 px-3 text-right">Min</th>
                    <th className="py-2 px-3 text-right">Max</th>
                    <th className="py-2 px-3 text-right">Median</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.column} className="border-b border-gray-100">
                      <td className="py-1.5 px-3 font-mono text-xs">{s.column}</td>
                      <td className="py-1.5 px-3 text-right">{s.mean.toFixed(3)}</td>
                      <td className="py-1.5 px-3 text-right">{s.std.toFixed(3)}</td>
                      <td className="py-1.5 px-3 text-right">{s.min.toFixed(3)}</td>
                      <td className="py-1.5 px-3 text-right">{s.max.toFixed(3)}</td>
                      <td className="py-1.5 px-3 text-right">{s.median.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit info */}
          {data.auditInfo && (
            <div className="card">
              <h3 className="section-title">Audit Information</h3>
              {data.auditInfo.licenseNote && (
                <p className="text-sm text-gray-600 mb-2"><strong>License:</strong> {data.auditInfo.licenseNote}</p>
              )}
              {data.auditInfo.fileCounts && (
                <div className="text-sm text-gray-600">
                  <strong>File counts:</strong>
                  <ul className="mt-1 list-disc list-inside">
                    {Object.entries(data.auditInfo.fileCounts).map(([k, v]) => (
                      <li key={k}>{k}: {v}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.auditInfo.rowCounts && (
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Row counts:</strong>
                  <ul className="mt-1 list-disc list-inside">
                    {Object.entries(data.auditInfo.rowCounts).map(([k, v]) => (
                      <li key={k}>{k}: {v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Data never leaves browser note */}
          <div className="card bg-teal-50 border-teal-100">
            <p className="text-sm text-teal-700">
              <strong>Privacy:</strong> Your data never leaves the browser. No data is sent to any server, stored in localStorage, or persisted after you close the tab.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => navigate('/dictionary')}>
              View Data Dictionary
            </button>
            <button className="btn-secondary" onClick={() => navigate('/explorer')}>
              Explore Candidates
            </button>
            <button
              className="btn-outline"
              onClick={() => {
                setParseErrors([]);
                setData((prev) => ({ ...prev, ...emptyAppData }));
              }}
            >
              Clear Data
            </button>
          </div>
        </div>
      )}

      {!hasData && parseErrors.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No dataset loaded"
            message="Upload a features.csv file above to see dataset audit statistics. The app ships empty — no synthetic data is included."
          />
        </div>
      )}
    </PageWrapper>
  );
}
