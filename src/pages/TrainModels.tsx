import { useApp } from '@/context/AppContext';
import { useTrainingWorker } from '@/hooks/useTrainingWorker';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '@/components/PageWrapper';
import EmptyState from '@/components/EmptyState';
import StatBox from '@/components/StatBox';
import { emptyAppData } from '@/lib/appTypes';
import { CheckCircle, AlertCircle, Cpu } from 'lucide-react';
import type { TrainResponse } from '@/workers/train.worker';

export default function TrainModels() {
  const { data, setData } = useApp();
  const { train, isTraining, progress, status } = useTrainingWorker();
  const navigate = useNavigate();
  const hasData = data.candidates.length > 0;

  const handleTrain = () => {
    train(data.candidates, 42, (response: TrainResponse) => {
      setData((prev) => ({
        ...prev,
        split: response.split,
        modelResults: response.results,
        lrModel: response.lrModel,
        rfModel: response.rfModel,
        bootstrapCis: response.bootstrapCis,
        calibrationData: response.calibrationData,
        trainingProgress: 100,
        trainingStatus: 'Done',
      }));
    });
  };

  if (!hasData) {
    return (
      <PageWrapper title="Train Models">
        <EmptyState
          title="No dataset loaded"
          message="Upload a features.csv on the Dataset Audit page before training."
        />
      </PageWrapper>
    );
  }

  const split = data.split;

  return (
    <PageWrapper title="Train Models" subtitle="Grouped train/test split with seed 42. Two algorithms trained in a Web Worker.">
      {/* Split info */}
      <div className="card mb-6">
        <h3 className="section-title">Grouped Train/Test Split (seed 42, 80/20 by group)</h3>
        {!split && !isTraining && (
          <p className="text-gray-500 text-sm">
            Click "Train Models" below to split the data and train both models. The split ensures no group (scan/series) appears in both train and test sets.
          </p>
        )}
        {split && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatBox label="Train Rows" value={split.trainRows.length} />
              <StatBox label="Test Rows" value={split.testRows.length} color="teal" />
              <StatBox label="Train Groups" value={split.trainGroups.length} />
              <StatBox label="Test Groups" value={split.testGroups.length} color="teal" />
            </div>
            <div className={`rounded-lg p-4 border ${split.overlapCount === 0 ? 'bg-teal-50 border-teal-100' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-3">
                {split.overlapCount === 0 ? (
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <p className={`font-medium ${split.overlapCount === 0 ? 'text-teal-700' : 'text-red-700'}`}>
                  Group Overlap Check: {split.overlapCount} overlapping groups
                  {split.overlapCount === 0 && ' — PASS (zero overlap between train and test groups)'}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Feature names used for training:</p>
              <div className="flex flex-wrap gap-2">
                {split.featureNames.map((f) => (
                  <span key={f} className="text-xs bg-navy-50 text-navy-500 px-2 py-1 rounded font-mono">{f}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Training controls */}
      <div className="card mb-6">
        <h3 className="section-title">Training</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Two algorithms will be trained with class weights to handle imbalance:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-navy-50 rounded-lg p-4">
                <p className="font-medium text-navy-500">Logistic Regression</p>
                <p className="text-xs text-gray-500 mt-1">Gradient descent, L2 regularization, 800 epochs, class weights</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-4">
                <p className="font-medium text-teal-700">Random Forest</p>
                <p className="text-xs text-gray-500 mt-1">40 trees, max depth 8, feature subsampling, class weights</p>
              </div>
            </div>
          </div>

          {(isTraining || progress > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-teal-500 animate-pulse" />
                <span className="text-sm text-gray-600">{status}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{progress}%</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="btn-primary"
              onClick={handleTrain}
              disabled={isTraining}
            >
              {isTraining ? 'Training...' : split ? 'Retrain Models' : 'Train Models'}
            </button>
            {data.modelResults.length > 0 && (
              <button className="btn-secondary" onClick={() => navigate('/evaluation')}>
                View Evaluation
              </button>
            )}
            {data.modelResults.length > 0 && (
              <button
                className="btn-outline"
                onClick={() => {
                  setData((prev) => ({
                    ...prev,
                    split: null,
                    modelResults: [],
                    lrModel: null,
                    rfModel: null,
                    errorRows: [],
                    errorBins: [],
                    bootstrapCis: null,
                    calibrationData: [],
                    trainingProgress: 0,
                    trainingStatus: '',
                  }));
                }}
              >
                Clear Models
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Model results summary */}
      {data.modelResults.length > 0 && (
        <div className="card">
          <h3 className="section-title">Trained Models Summary</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3">Model</th>
                <th className="py-2 px-3 text-right">Accuracy</th>
                <th className="py-2 px-3 text-right">ROC-AUC</th>
                <th className="py-2 px-3 text-right">F1</th>
                <th className="py-2 px-3 text-right">Brier</th>
              </tr>
            </thead>
            <tbody>
              {data.modelResults.map((r) => (
                <tr key={r.modelName} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-medium">{r.modelName}</td>
                  <td className="py-2 px-3 text-right">{(r.metrics.accuracy * 100).toFixed(2)}%</td>
                  <td className="py-2 px-3 text-right">{r.metrics.rocAuc.toFixed(4)}</td>
                  <td className="py-2 px-3 text-right">{r.metrics.f1.toFixed(4)}</td>
                  <td className="py-2 px-3 text-right">{r.metrics.brierScore.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 bg-navy-50 rounded-lg p-3">
            <p className="text-xs text-navy-600">
              <strong>Standardizer</strong> fitted on training data only. Class imbalance handled via class weights (no row duplication).
              Training runs in a Web Worker to keep the UI responsive.
            </p>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
