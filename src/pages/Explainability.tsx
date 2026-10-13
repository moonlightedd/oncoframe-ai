import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import EmptyState from '@/components/EmptyState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

export default function Explainability() {
  const { data } = useApp();
  const hasModels = data.modelResults.length > 0;

  if (!hasModels) {
    return (
      <PageWrapper title="Explainability">
        <EmptyState
          title="Model not trained yet"
          message="Train models on the Train Models page first. Feature importances and coefficients will appear here."
        />
      </PageWrapper>
    );
  }

  const lrResult = data.modelResults.find((r) => r.modelName === 'Logistic Regression');
  const rfResult = data.modelResults.find((r) => r.modelName === 'Random Forest');

  const lrData = (lrResult?.coefficients ?? []).slice(0, 20).map((c) => ({
    feature: c.feature,
    value: c.coefficient,
  }));

  const rfData = (rfResult?.featureImportances ?? []).slice(0, 20).map((f) => ({
    feature: f.feature,
    value: f.importance,
  }));

  return (
    <PageWrapper title="Explainability" subtitle="Feature importances and standardized coefficients from your trained models.">
      <div className="card mb-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Importances show association in this dataset, not causation. A high-importance feature correlates with the label but does not cause nodule candidacy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Random Forest feature importances */}
        {rfData.length > 0 && (
          <div className="card">
            <h3 className="section-title">Random Forest — Feature Importances</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, rfData.length * 25)}>
              <BarChart data={rfData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v) => Number(v).toFixed(6)} />
                <Bar dataKey="value" fill="#14B8A6" name="Importance" />
              </BarChart>
            </ResponsiveContainer>
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1.5 px-2">Feature</th>
                  <th className="py-1.5 px-2 text-right">Importance</th>
                </tr>
              </thead>
              <tbody>
                {(rfResult?.featureImportances ?? []).slice(0, 15).map((f) => (
                  <tr key={f.feature} className="border-b border-gray-100">
                    <td className="py-1 px-2 font-mono text-xs">{f.feature}</td>
                    <td className="py-1 px-2 text-right font-mono text-xs">{f.importance.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Logistic Regression coefficients */}
        {lrData.length > 0 && (
          <div className="card">
            <h3 className="section-title">Logistic Regression — Standardized Coefficients</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, lrData.length * 25)}>
              <BarChart data={lrData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v) => Number(v).toFixed(6)} />
                <Bar dataKey="value" name="Coefficient">
                  {lrData.map((d, i) => (
                    <Cell key={i} fill={d.value >= 0 ? '#14B8A6' : '#0B1F3A'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1.5 px-2">Feature</th>
                  <th className="py-1.5 px-2 text-right">Coefficient</th>
                  <th className="py-1.5 px-2">Direction</th>
                </tr>
              </thead>
              <tbody>
                {(lrResult?.coefficients ?? []).slice(0, 15).map((c) => (
                  <tr key={c.feature} className="border-b border-gray-100">
                    <td className="py-1 px-2 font-mono text-xs">{c.feature}</td>
                    <td className="py-1 px-2 text-right font-mono text-xs">{c.coefficient.toFixed(6)}</td>
                    <td className="py-1 px-2 text-xs">
                      <span className={c.coefficient >= 0 ? 'text-teal-600' : 'text-navy-500'}>
                        {c.coefficient >= 0 ? 'Positive association' : 'Negative association'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
