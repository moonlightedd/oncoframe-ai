import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import EmptyState from '@/components/EmptyState';
import { predictLogistic, predictRandomForest } from '@/lib/models';
import type { CandidateRow } from '@/lib/types';
import { Target } from 'lucide-react';

export default function Predict() {
  const { data } = useApp();
  const hasModels = data.lrModel !== null && data.rfModel !== null;
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [manualFeatures, setManualFeatures] = useState<Record<string, string>>({});
  const [predictionMode, setPredictionMode] = useState<'select' | 'manual'>('select');

  const testRows = data.split?.testRows ?? [];
  const featureNames = data.split?.featureNames ?? data.numericColumns.filter(
    (c) => !['candidate_id', 'group_id', 'coordX', 'coordY', 'coordZ', 'label'].includes(c)
  );

  const selectedRow = useMemo(() => {
    if (!selectedCandidateId) return null;
    return testRows.find((r) => r.candidate_id === selectedCandidateId) ?? null;
  }, [selectedCandidateId, testRows]);

  const manualRow = useMemo<CandidateRow | null>(() => {
    const allFilled = featureNames.every((f) => manualFeatures[f] !== undefined && manualFeatures[f] !== '');
    if (!allFilled) return null;
    const row: CandidateRow = {
      candidate_id: 'manual_input',
      group_id: 'manual',
      coordX: 0,
      coordY: 0,
      coordZ: 0,
      label: 0,
    };
    for (const f of featureNames) {
      row[f] = Number(manualFeatures[f]);
    }
    return row;
  }, [manualFeatures, featureNames]);

  const predictions = useMemo(() => {
    if (!hasModels) return null;
    const row = predictionMode === 'select' ? selectedRow : manualRow;
    if (!row) return null;
    const lr = data.lrModel ? predictLogistic(data.lrModel, row) : null;
    const rf = data.rfModel ? predictRandomForest(data.rfModel, row) : null;
    return { lr, rf };
  }, [hasModels, selectedRow, manualRow, predictionMode, data.lrModel, data.rfModel]);

  if (!hasModels) {
    return (
      <PageWrapper title="Predict" showDisclaimer={false}>
        <EmptyState
          title="Model not trained yet"
          message="Train models on the Train Models page first. You can then pick a test candidate or enter feature values to see predictions."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Predict" subtitle="Pick a test candidate or enter feature values to see each model's predicted class and score.">
      {/* Mode toggle */}
      <div className="card mb-6">
        <div className="flex gap-3 mb-4">
          <button
            className={predictionMode === 'select' ? 'btn-primary' : 'btn-outline'}
            onClick={() => setPredictionMode('select')}
          >
            Select from Test Set
          </button>
          <button
            className={predictionMode === 'manual' ? 'btn-primary' : 'btn-outline'}
            onClick={() => setPredictionMode('manual')}
          >
            Enter Manually
          </button>
        </div>

        {predictionMode === 'select' ? (
          <div>
            <label className="text-sm text-gray-500 block mb-1">Select a candidate from the test set:</label>
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              className="input-field"
            >
              <option value="">— Select a candidate —</option>
              {testRows.map((r) => (
                <option key={r.candidate_id} value={r.candidate_id}>
                  {r.candidate_id} (group: {r.group_id}, label: {r.label})
                </option>
              ))}
            </select>
            {selectedRow && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Feature values:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {featureNames.map((f) => (
                    <div key={f} className="bg-navy-50 rounded px-2 py-1">
                      <p className="text-[10px] text-gray-500 font-mono">{f}</p>
                      <p className="text-sm font-mono text-navy-500">{Number(selectedRow[f]).toFixed(3)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">Enter feature values:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featureNames.map((f) => (
                <div key={f}>
                  <label className="text-xs text-gray-500 font-mono block mb-1">{f}</label>
                  <input
                    type="number"
                    step="any"
                    value={manualFeatures[f] ?? ''}
                    onChange={(e) => setManualFeatures((prev) => ({ ...prev, [f]: e.target.value }))}
                    className="input-field"
                    placeholder="0.0"
                  />
                </div>
              ))}
            </div>
            {!manualRow && (
              <p className="text-xs text-amber-600 mt-3">Fill in all feature values to get predictions.</p>
            )}
          </div>
        )}
      </div>

      {/* Predictions */}
      {predictions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {predictions.lr && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-teal-500" />
                <h3 className="section-title mb-0">Logistic Regression</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-box">
                  <p className="text-xs text-gray-500">Predicted Class</p>
                  <p className="text-2xl font-bold text-navy-500">{predictions.lr.pred}</p>
                  <p className="text-xs text-gray-400">
                    {predictions.lr.pred === 1 ? 'Nodule candidate' : 'Non-nodule candidate'}
                  </p>
                </div>
                <div className="stat-box">
                  <p className="text-xs text-gray-500">Probability Score</p>
                  <p className="text-2xl font-bold text-teal-600">{(predictions.lr.prob * 100).toFixed(2)}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                    <div className="bg-teal-500 h-full" style={{ width: `${predictions.lr.prob * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          {predictions.rf && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-teal-500" />
                <h3 className="section-title mb-0">Random Forest</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-box">
                  <p className="text-xs text-gray-500">Predicted Class</p>
                  <p className="text-2xl font-bold text-navy-500">{predictions.rf.pred}</p>
                  <p className="text-xs text-gray-400">
                    {predictions.rf.pred === 1 ? 'Nodule candidate' : 'Non-nodule candidate'}
                  </p>
                </div>
                <div className="stat-box">
                  <p className="text-xs text-gray-500">Probability Score</p>
                  <p className="text-2xl font-bold text-teal-600">{(predictions.rf.prob * 100).toFixed(2)}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                    <div className="bg-teal-500 h-full" style={{ width: `${predictions.rf.prob * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <p className="text-sm text-amber-800">
          <strong>Research and education prototype. Not clinically validated. Not for diagnosis.</strong>{' '}
          A nodule candidate is not a cancer diagnosis. Predictions are based on image features from your uploaded dataset only.
        </p>
      </div>
    </PageWrapper>
  );
}
