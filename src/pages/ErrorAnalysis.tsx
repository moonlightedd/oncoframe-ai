import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import EmptyState from '@/components/EmptyState';
import type { ErrorRow, FeatureBins } from '@/lib/types';

export default function ErrorAnalysis() {
  const { data, setData } = useApp();
  const hasModels = data.modelResults.length > 0;
  const [groupByFeature, setGroupByFeature] = useState<string>('');
  const [errorTypeFilter, setErrorTypeFilter] = useState<'all' | 'false_positive' | 'false_negative'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const featureNames = data.split?.featureNames ?? [];

  // Compute error rows
  useEffect(() => {
    if (!hasModels || !data.split) return;
    const testRows = data.split.testRows;
    const allErrors: ErrorRow[] = [];
    for (const result of data.modelResults) {
      for (let i = 0; i < testRows.length; i++) {
        const trueLabel = testRows[i].label;
        const predLabel = result.predictions[i];
        if (trueLabel !== predLabel) {
          const features: Record<string, number> = {};
          for (const fn of featureNames) {
            features[fn] = Number(testRows[i][fn]);
          }
          allErrors.push({
            candidate_id: testRows[i].candidate_id,
            group_id: testRows[i].group_id,
            trueLabel,
            predictedLabel: predLabel,
            probability: result.probabilities[i],
            errorType: trueLabel === 1 ? 'false_negative' : 'false_positive',
            features,
          });
        }
      }
    }
    setData((prev) => ({ ...prev, errorRows: allErrors }));
  }, [data.modelResults, data.split]);

  // Auto-select first feature for grouping
  useEffect(() => {
    if (featureNames.length > 0 && !groupByFeature) {
      setGroupByFeature(featureNames[0]);
    }
  }, [featureNames, groupByFeature]);

  // Compute bins
  const bins: FeatureBins[] = useMemo(() => {
    if (!groupByFeature || data.errorRows.length === 0) return [];
    const values = data.errorRows.map((e) => e.features[groupByFeature]).filter((v) => !isNaN(v));
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const nBins = 5;
    const binWidth = (max - min) / nBins || 1;
    const binData: FeatureBins[] = Array.from({ length: nBins }, (_, i) => ({
      binLabel: `${(min + i * binWidth).toFixed(2)} - ${(min + (i + 1) * binWidth).toFixed(2)}`,
      count: 0,
      falsePositives: 0,
      falseNegatives: 0,
      rangeStart: min + i * binWidth,
      rangeEnd: min + (i + 1) * binWidth,
    }));
    for (const err of data.errorRows) {
      const v = err.features[groupByFeature];
      if (isNaN(v)) continue;
      const idx = Math.min(Math.floor((v - min) / binWidth), nBins - 1);
      binData[idx].count++;
      if (err.errorType === 'false_positive') binData[idx].falsePositives++;
      else binData[idx].falseNegatives++;
    }
    setData((prev) => ({ ...prev, errorBins: binData }));
    return binData;
  }, [groupByFeature, data.errorRows]);

  // Generate summary
  const summary = useMemo(() => {
    if (data.errorRows.length === 0) return '';
    const fps = data.errorRows.filter((e) => e.errorType === 'false_positive').length;
    const fns = data.errorRows.filter((e) => e.errorType === 'false_negative').length;
    const total = data.split?.testRows.length ?? 0;
    const fpRate = total > 0 ? (fps / total * 100).toFixed(1) : '0';
    const fnRate = total > 0 ? (fns / total * 100).toFixed(1) : '0';

    let summaryText = `Across both models on ${total} test candidates, there are ${fps} false positive(s) (${fpRate}% of test set) and ${fns} false negative(s) (${fnRate}% of test set). `;
    if (bins.length > 0) {
      const maxBin = bins.reduce((a, b) => (b.count > a.count ? b : a), bins[0]);
      summaryText += `When grouping errors by ${groupByFeature}, the bin "${maxBin.binLabel}" has the most errors (${maxBin.count}), with ${maxBin.falsePositives} false positive(s) and ${maxBin.falseNegatives} false negative(s). `;
    }
    summaryText += `These numbers are computed entirely from the uploaded dataset and the model predictions on the held-out test set.`;
    return summaryText;
  }, [data.errorRows, bins, groupByFeature, data.split]);

  if (!hasModels) {
    return (
      <PageWrapper title="Error Analysis">
        <EmptyState
          title="Model not trained yet"
          message="Train models on the Train Models page first. False positives and false negatives will be listed here."
        />
      </PageWrapper>
    );
  }

  const filteredErrors = errorTypeFilter === 'all'
    ? data.errorRows
    : data.errorRows.filter((e) => e.errorType === errorTypeFilter);
  const pagedErrors = filteredErrors.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredErrors.length / pageSize);

  return (
    <PageWrapper title="Error Analysis" subtitle="False positives and false negatives from the held-out test set, with feature-level grouping.">
      {/* Summary */}
      <div className="card mb-6 bg-navy-50 border-navy-100">
        <h3 className="section-title">Auto-Generated Summary</h3>
        <p className="text-sm text-navy-600 leading-relaxed">{summary}</p>
      </div>

      {/* Group by controls */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Group errors by:</label>
            <select
              value={groupByFeature}
              onChange={(e) => setGroupByFeature(e.target.value)}
              className="input-field w-auto"
            >
              {featureNames.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Filter:</label>
            <select
              value={errorTypeFilter}
              onChange={(e) => { setErrorTypeFilter(e.target.value as 'all' | 'false_positive' | 'false_negative'); setPage(0); }}
              className="input-field w-auto"
            >
              <option value="all">All errors</option>
              <option value="false_positive">False positives only</option>
              <option value="false_negative">False negatives only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error bins table */}
      {bins.length > 0 && (
        <div className="card mb-6">
          <h3 className="section-title">Errors Binned by {groupByFeature}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3">Range</th>
                <th className="py-2 px-3 text-right">Total Errors</th>
                <th className="py-2 px-3 text-right">False Positives</th>
                <th className="py-2 px-3 text-right">False Negatives</th>
              </tr>
            </thead>
            <tbody>
              {bins.map((b) => (
                <tr key={b.binLabel} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-mono text-xs">{b.binLabel}</td>
                  <td className="py-2 px-3 text-right">{b.count}</td>
                  <td className="py-2 px-3 text-right text-amber-600">{b.falsePositives}</td>
                  <td className="py-2 px-3 text-right text-red-600">{b.falseNegatives}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error rows table */}
      <div className="card">
        <h3 className="section-title">Error Rows ({filteredErrors.length} total)</h3>
        <div className="overflow-x-auto scrollbar-thin max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3">Candidate ID</th>
                <th className="py-2 px-3">Group ID</th>
                <th className="py-2 px-3">True</th>
                <th className="py-2 px-3">Pred</th>
                <th className="py-2 px-3">Prob</th>
                <th className="py-2 px-3">Type</th>
                {featureNames.slice(0, 8).map((f) => (
                  <th key={f} className="py-2 px-3 text-right whitespace-nowrap">{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedErrors.map((e, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 px-3 font-mono text-xs">{e.candidate_id}</td>
                  <td className="py-1.5 px-3 font-mono text-xs">{e.group_id}</td>
                  <td className="py-1.5 px-3">{e.trueLabel}</td>
                  <td className="py-1.5 px-3">{e.predictedLabel}</td>
                  <td className="py-1.5 px-3 font-mono text-xs">{e.probability.toFixed(4)}</td>
                  <td className="py-1.5 px-3">
                    <span className={e.errorType === 'false_positive' ? 'text-amber-600 text-xs' : 'text-red-600 text-xs'}>
                      {e.errorType === 'false_positive' ? 'FP' : 'FN'}
                    </span>
                  </td>
                  {featureNames.slice(0, 8).map((f) => (
                    <td key={f} className="py-1.5 px-3 text-right font-mono text-xs">{e.features[f]?.toFixed(3) ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button className="btn-outline text-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
            <button className="btn-outline text-sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
