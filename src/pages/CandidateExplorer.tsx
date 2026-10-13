import { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import EmptyState from '@/components/EmptyState';
import { exportChartPng } from '@/lib/export';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ScatterChart, Scatter, ResponsiveContainer,
} from 'recharts';
import { ArrowUpDown, Download } from 'lucide-react';

type SortDir = 'asc' | 'desc';

export default function CandidateExplorer() {
  const { data } = useApp();
  const hasData = data.candidates.length > 0;
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState<'all' | '0' | '1'>('all');
  const [sortBy, setSortBy] = useState<string>('candidate_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [histFeature, setHistFeature] = useState<string>('');
  const [scatterX, setScatterX] = useState<string>('');
  const [scatterY, setScatterY] = useState<string>('');

  const histRef = useRef<HTMLDivElement>(null);
  const scatterRef = useRef<HTMLDivElement>(null);

  const featureCols = useMemo(() => {
    const nonFeature = new Set(['candidate_id', 'group_id', 'coordX', 'coordY', 'coordZ', 'label']);
    return data.columns.filter((c) => !nonFeature.has(c));
  }, [data.columns]);

  useMemo(() => {
    if (featureCols.length > 0 && !histFeature) setHistFeature(featureCols[0]);
    if (featureCols.length > 1 && !scatterX) setScatterX(featureCols[0]);
    if (featureCols.length > 1 && !scatterY) setScatterY(featureCols[1]);
  }, [featureCols, histFeature, scatterX, scatterY]);

  const filteredRows = useMemo(() => {
    let rows = data.rawRows;
    if (labelFilter !== 'all') {
      rows = rows.filter((r) => String(r.label) === labelFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        String(r.candidate_id).toLowerCase().includes(s) ||
        String(r.group_id).toLowerCase().includes(s)
      );
    }
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      const an = Number(av);
      const bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) {
        return sortDir === 'asc' ? an - bn : bn - an;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [data.rawRows, labelFilter, search, sortBy, sortDir]);

  const pagedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredRows.length / pageSize);

  const histData = useMemo(() => {
    if (!histFeature) return [];
    const posVals = data.rawRows.filter((r) => Number(r.label) === 1).map((r) => Number(r[histFeature]));
    const negVals = data.rawRows.filter((r) => Number(r.label) === 0).map((r) => Number(r[histFeature]));
    const allVals = [...posVals, ...negVals];
    if (allVals.length === 0) return [];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const nBins = 20;
    const binWidth = (max - min) / nBins || 1;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      bin: `${(min + i * binWidth).toFixed(1)}`,
      positive: 0,
      negative: 0,
    }));
    for (const v of posVals) {
      const idx = Math.min(Math.floor((v - min) / binWidth), nBins - 1);
      bins[idx].positive++;
    }
    for (const v of negVals) {
      const idx = Math.min(Math.floor((v - min) / binWidth), nBins - 1);
      bins[idx].negative++;
    }
    return bins;
  }, [histFeature, data.rawRows]);

  const scatterData = useMemo(() => {
    if (!scatterX || !scatterY) return { positive: [], negative: [] };
    const positive = data.rawRows
      .filter((r) => Number(r.label) === 1)
      .map((r) => ({ x: Number(r[scatterX]), y: Number(r[scatterY]) }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    const negative = data.rawRows
      .filter((r) => Number(r.label) === 0)
      .map((r) => ({ x: Number(r[scatterX]), y: Number(r[scatterY]) }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    return { positive, negative };
  }, [scatterX, scatterY, data.rawRows]);

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  if (!hasData) {
    return (
      <PageWrapper title="Candidate Explorer">
        <EmptyState
          title="No dataset loaded"
          message="Upload a features.csv on the Dataset Audit page to explore candidates."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Candidate Explorer" subtitle="Filter, sort, and visualize candidate features by class. No CT image rendering is claimed.">
      {/* Filter bar */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by candidate_id or group_id..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="input-field flex-1 min-w-[200px]"
          />
          <select
            value={labelFilter}
            onChange={(e) => { setLabelFilter(e.target.value as 'all' | '0' | '1'); setPage(0); }}
            className="input-field w-auto"
          >
            <option value="all">All labels</option>
            <option value="1">Label = 1 (nodule)</option>
            <option value="0">Label = 0 (non-nodule)</option>
          </select>
          <span className="text-sm text-gray-500">{filteredRows.length} candidates</span>
        </div>
      </div>

      {/* Table */}
      <div className="card mb-6">
        <div className="overflow-x-auto scrollbar-thin max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500 border-b">
                {data.columns.map((col) => (
                  <th
                    key={col}
                    className="py-2 px-3 cursor-pointer hover:text-teal-600 whitespace-nowrap"
                    onClick={() => toggleSort(col)}
                  >
                    <span className="flex items-center gap-1">
                      {col}
                      {sortBy === col && <ArrowUpDown className="w-3 h-3" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  {data.columns.map((col) => (
                    <td key={col} className="py-1.5 px-3 font-mono text-xs whitespace-nowrap">
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              className="btn-outline text-sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
            <button
              className="btn-outline text-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Histogram */}
      {featureCols.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="section-title mb-0">Histogram by Class</h3>
              <select
                value={histFeature}
                onChange={(e) => setHistFeature(e.target.value)}
                className="input-field w-auto"
              >
                {featureCols.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <button className="btn-outline text-sm" onClick={() => exportChartPng(histRef.current, 'histogram.png')}>
              <span className="flex items-center gap-1"><Download className="w-3 h-3" /> PNG</span>
            </button>
          </div>
          <div ref={histRef}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="bin" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="positive" fill="#14B8A6" name="Label = 1" />
                <Bar dataKey="negative" fill="#0B1F3A" name="Label = 0" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Scatter plot */}
      {featureCols.length > 1 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="section-title mb-0">Scatter Plot by Class</h3>
              <select value={scatterX} onChange={(e) => setScatterX(e.target.value)} className="input-field w-auto">
                {featureCols.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <span className="text-gray-400">vs</span>
              <select value={scatterY} onChange={(e) => setScatterY(e.target.value)} className="input-field w-auto">
                {featureCols.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <button className="btn-outline text-sm" onClick={() => exportChartPng(scatterRef.current, 'scatter.png')}>
              <span className="flex items-center gap-1"><Download className="w-3 h-3" /> PNG</span>
            </button>
          </div>
          <div ref={scatterRef}>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" dataKey="x" name={scatterX} tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name={scatterY} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Label = 1" data={scatterData.positive} fill="#14B8A6" />
                <Scatter name="Label = 0" data={scatterData.negative} fill="#0B1F3A" opacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
