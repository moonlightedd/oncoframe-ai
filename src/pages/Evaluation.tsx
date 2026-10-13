import { useRef } from 'react';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import EmptyState from '@/components/EmptyState';
import StatBox from '@/components/StatBox';
import { exportMetricsJson, exportChartPng } from '@/lib/export';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar,
} from 'recharts';
import { Download, BarChart3 } from 'lucide-react';

export default function Evaluation() {
  const { data } = useApp();
  const hasModels = data.modelResults.length > 0;
  const rocRef = useRef<HTMLDivElement>(null);
  const prRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  if (!hasModels) {
    return (
      <PageWrapper title="Evaluation">
        <EmptyState
          title="Model not trained yet"
          message="Train models on the Train Models page first. Evaluation metrics will appear here once training is complete."
        />
      </PageWrapper>
    );
  }

  const results = data.modelResults;
  const testLabels = data.split?.testRows.map((r) => r.label) ?? [];

  return (
    <PageWrapper title="Evaluation" subtitle="Metrics computed on the held-out group test set. All numbers are from your uploaded data.">
      {/* Model comparison table */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Model Comparison</h3>
          <button className="btn-outline text-sm" onClick={() => exportMetricsJson(results)}>
            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> Export metrics.json</span>
          </button>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3">Metric</th>
                {results.map((r) => (
                  <th key={r.modelName} className="py-2 px-3 text-right">{r.modelName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Accuracy', key: 'accuracy', fmt: (v: number) => `${(v * 100).toFixed(2)}%` },
                { label: 'Precision', key: 'precision', fmt: (v: number) => v.toFixed(4) },
                { label: 'Recall/Sensitivity', key: 'recall', fmt: (v: number) => v.toFixed(4) },
                { label: 'Specificity', key: 'specificity', fmt: (v: number) => v.toFixed(4) },
                { label: 'F1 Score', key: 'f1', fmt: (v: number) => v.toFixed(4) },
                { label: 'ROC-AUC', key: 'rocAuc', fmt: (v: number) => v.toFixed(4) },
                { label: 'PR-AUC', key: 'prAuc', fmt: (v: number) => v.toFixed(4) },
                { label: 'Brier Score', key: 'brierScore', fmt: (v: number) => v.toFixed(4) },
              ].map((metric) => (
                <tr key={metric.key} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-medium">{metric.label}</td>
                  {results.map((r) => (
                    <td key={r.modelName} className="py-2 px-3 text-right font-mono">
                      {metric.fmt((r.metrics as unknown as Record<string, number>)[metric.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bootstrap CIs */}
        {data.bootstrapCis && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-navy-500 mb-2">Group-Level Bootstrap 95% CIs (300 resamples, seeded)</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-3">Metric</th>
                  {results.map((r) => (
                    <th key={r.modelName} className="py-2 px-3 text-right">{r.modelName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['accuracy', 'rocAuc'].map((metric) => (
                  <tr key={metric} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium capitalize">{metric === 'rocAuc' ? 'ROC-AUC' : metric}</td>
                    {results.map((r) => {
                      const ci = data.bootstrapCis?.[r.modelName]?.[metric];
                      return (
                        <td key={r.modelName} className="py-2 px-3 text-right font-mono text-xs">
                          {ci ? `${ci.mean.toFixed(4)} [{ci.lower95.toFixed(4)}, ${ci.upper95.toFixed(4)}]` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confusion matrices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {results.map((r) => {
          const cm = r.metrics.confusionMatrix;
          const total = cm.tp + cm.fp + cm.tn + cm.fn;
          return (
            <div key={r.modelName} className="card">
              <h3 className="section-title">{r.modelName} — Confusion Matrix</h3>
              <table className="w-full text-center text-sm">
                <thead>
                  <tr>
                    <th className="py-2"></th>
                    <th className="py-2 px-3 text-gray-500">Pred 0</th>
                    <th className="py-2 px-3 text-gray-500">Pred 1</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-3 text-gray-500 font-medium text-left">True 0</td>
                    <td className="py-2 px-3 bg-teal-50 font-mono text-lg">{cm.tn}</td>
                    <td className="py-2 px-3 bg-amber-50 font-mono text-lg">{cm.fp}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gray-500 font-medium text-left">True 1</td>
                    <td className="py-2 px-3 bg-amber-50 font-mono text-lg">{cm.fn}</td>
                    <td className="py-2 px-3 bg-teal-50 font-mono text-lg">{cm.tp}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2 text-center">N = {total} test candidates</p>
            </div>
          );
        })}
      </div>

      {/* ROC curves */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">ROC Curves</h3>
          <button className="btn-outline text-sm" onClick={() => exportChartPng(rocRef.current, 'roc_curves.png')}>
            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> PNG</span>
          </button>
        </div>
        <div ref={rocRef}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" dataKey="fpr" domain={[0, 1]} label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5, fontSize: 12 }} tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="tpr" domain={[0, 1]} label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fontSize: 12 }} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" data={results[0].metrics.rocCurve} dataKey="tpr" stroke="#14B8A6" name={`${results[0].modelName} (AUC=${results[0].metrics.rocAuc.toFixed(3)})`} dot={false} strokeWidth={2} />
              {results.length > 1 && (
                <Line type="monotone" data={results[1].metrics.rocCurve} dataKey="tpr" stroke="#0B1F3A" name={`${results[1].modelName} (AUC=${results[1].metrics.rocAuc.toFixed(3)})`} dot={false} strokeWidth={2} />
              )}
              <Line type="monotone" data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} dataKey="tpr" stroke="#ccc" name="Random" dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PR curves */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Precision-Recall Curves</h3>
          <button className="btn-outline text-sm" onClick={() => exportChartPng(prRef.current, 'pr_curves.png')}>
            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> PNG</span>
          </button>
        </div>
        <div ref={prRef}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" dataKey="recall" domain={[0, 1]} label={{ value: 'Recall', position: 'insideBottom', offset: -5, fontSize: 12 }} tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="precision" domain={[0, 1]} label={{ value: 'Precision', angle: -90, position: 'insideLeft', fontSize: 12 }} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" data={results[0].metrics.prCurve} dataKey="precision" stroke="#14B8A6" name={`${results[0].modelName} (AUC=${results[0].metrics.prAuc.toFixed(3)})`} dot={false} strokeWidth={2} />
              {results.length > 1 && (
                <Line type="monotone" data={results[1].metrics.prCurve} dataKey="precision" stroke="#0B1F3A" name={`${results[1].modelName} (AUC=${results[1].metrics.prAuc.toFixed(3)})`} dot={false} strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calibration plots */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Calibration Plots</h3>
          <button className="btn-outline text-sm" onClick={() => exportChartPng(calRef.current, 'calibration.png')}>
            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> PNG</span>
          </button>
        </div>
        <div ref={calRef}>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" dataKey="predictedProb" domain={[0, 1]} label={{ value: 'Mean Predicted Probability', position: 'insideBottom', offset: -5, fontSize: 12 }} tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="observedProb" domain={[0, 1]} label={{ value: 'Observed Proportion', angle: -90, position: 'insideLeft', fontSize: 12 }} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {data.calibrationData.map((cal, i) => (
                <Scatter
                  key={cal.model}
                  name={`${cal.model} (Brier=${results[i]?.metrics.brierScore.toFixed(3) ?? '—'})`}
                  data={cal.points}
                  fill={i === 0 ? '#14B8A6' : '#0B1F3A'}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex justify-center mt-2 gap-4">
            {results.map((r) => (
              <span key={r.modelName} className="text-xs text-gray-500">
                {r.modelName} Brier Score: <strong>{r.metrics.brierScore.toFixed(4)}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
