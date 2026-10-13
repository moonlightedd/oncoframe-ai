import PageWrapper from '@/components/PageWrapper';

interface FeatureItem {
  feature: string;
  status: 'IMPLEMENTED' | 'TESTED' | 'PROPOSED' | 'NOT VERIFIED';
}

const features: FeatureItem[] = [
  { feature: 'CSV upload with PapaParse and column validation', status: 'TESTED' },
  { feature: 'Dataset audit (rows, groups, class balance, missing values, duplicates, summary stats)', status: 'IMPLEMENTED' },
  { feature: '5,000-row minimum requirement check', status: 'IMPLEMENTED' },
  { feature: 'Data dictionary (uploaded or auto-generated)', status: 'IMPLEMENTED' },
  { feature: 'Candidate explorer (filter, sort, histogram, scatter)', status: 'IMPLEMENTED' },
  { feature: 'Grouped train/test split with seeded PRNG (seed 42)', status: 'TESTED' },
  { feature: 'Group overlap verification (must equal 0)', status: 'TESTED' },
  { feature: 'Logistic Regression with class weights and L2', status: 'IMPLEMENTED' },
  { feature: 'Random Forest with feature subsampling', status: 'IMPLEMENTED' },
  { feature: 'Standardizer fitted on training data only', status: 'IMPLEMENTED' },
  { feature: 'Web Worker for non-blocking training', status: 'IMPLEMENTED' },
  { feature: 'Confusion matrix, accuracy, precision, recall, specificity, F1', status: 'TESTED' },
  { feature: 'ROC curve + ROC-AUC', status: 'IMPLEMENTED' },
  { feature: 'PR curve + PR-AUC', status: 'IMPLEMENTED' },
  { feature: 'Calibration plot + Brier score', status: 'IMPLEMENTED' },
  { feature: 'Group-level bootstrap 95% CIs (seeded)', status: 'TESTED' },
  { feature: 'Side-by-side model comparison table', status: 'IMPLEMENTED' },
  { feature: 'Export results as metrics.json', status: 'IMPLEMENTED' },
  { feature: 'Export figures as PNG', status: 'IMPLEMENTED' },
  { feature: 'Random Forest feature importances', status: 'IMPLEMENTED' },
  { feature: 'Logistic Regression standardized coefficients', status: 'IMPLEMENTED' },
  { feature: 'Error analysis (FP/FN listing, binning, summary)', status: 'IMPLEMENTED' },
  { feature: 'Predict from test set or manual input', status: 'IMPLEMENTED' },
  { feature: 'Empty state when no data loaded', status: 'TESTED' },
  { feature: 'CSV validation rejects bad columns', status: 'TESTED' },
  { feature: '3D CT volume viewing', status: 'PROPOSED' },
  { feature: 'Nodule segmentation', status: 'PROPOSED' },
  { feature: 'Diameter / volume estimation', status: 'PROPOSED' },
  { feature: 'Longitudinal scan comparison', status: 'PROPOSED' },
  { feature: 'Improved explainability (SHAP, partial dependence)', status: 'PROPOSED' },
  { feature: 'External validation on independent dataset', status: 'PROPOSED' },
  { feature: 'Secure DICOM import and de-identification', status: 'PROPOSED' },
];

const knownLimitations = [
  'Labels are candidate-level (annotated nodule vs. non-nodule), not patient-level cancer diagnoses.',
  'Class imbalance is common and handled with class weights, but performance on the minority class may still be limited.',
  'Group mapping depends on the provided group_id column — if multiple candidates from the same scan share a group_id, splitting is correct; if group_id is mislabeled, leakage may occur.',
  'No clinical validation has been performed. This tool is for research and education only.',
  'Browser compute limits: training on very large datasets (>50,000 rows) may be slow or fail. The Random Forest depth and tree count are capped for responsiveness.',
  'All computation is in-browser; no GPU acceleration is used.',
];

const roadmap = [
  { item: '3D CT viewing', dataReq: 'Raw DICOM or MHD/raw volumes per scan', risk: 'Large file sizes; browser memory limits' },
  { item: 'Nodule segmentation', dataReq: 'Pixel-level or voxel-level annotations (LIDC-IDRI annotations)', risk: 'Higher compute cost; requires deep learning model' },
  { item: 'Diameter / volume estimation', dataReq: 'Segmentation masks or diameter annotations', risk: 'Accuracy depends on segmentation quality' },
  { item: 'Longitudinal scans', dataReq: 'Multiple scans per patient with timestamps', risk: 'Patient tracking privacy; registration between scans' },
  { item: 'Improved explainability (SHAP, PDP)', dataReq: 'Same features; SHAP library integration', risk: 'Compute cost in browser' },
  { item: 'External validation', dataReq: 'Independent dataset with same feature schema', risk: 'Feature distribution shift; license restrictions' },
  { item: 'Secure DICOM import and de-identification', dataReq: 'DICOM files; de-identification protocol', risk: 'PHI exposure if de-identification is incomplete' },
];

function StatusBadge({ status }: { status: FeatureItem['status'] }) {
  const cls = {
    IMPLEMENTED: 'badge-implemented',
    TESTED: 'badge-tested',
    PROPOSED: 'badge-proposed',
    'NOT VERIFIED': 'badge-notverified',
  };
  return <span className={cls[status]}>{status}</span>;
}

export default function Limitations() {
  return (
    <PageWrapper title="Limitations & Roadmap" subtitle="Feature status, known limitations, dataset attribution, and future directions.">
      {/* Feature status table */}
      <div className="card mb-6">
        <h3 className="section-title">Feature Status</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 px-3">Feature</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-3">{f.feature}</td>
                <td className="py-2 px-3"><StatusBadge status={f.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span><span className="badge-implemented">IMPLEMENTED</span> = built and working</span>
          <span><span className="badge-tested">TESTED</span> = has a passing Vitest test</span>
          <span><span className="badge-proposed">PROPOSED</span> = planned for next year</span>
          <span><span className="badge-notverified">NOT VERIFIED</span> = not yet confirmed</span>
        </div>
      </div>

      {/* Known limitations */}
      <div className="card mb-6">
        <h3 className="section-title">Known Limitations</h3>
        <ul className="space-y-2">
          {knownLimitations.map((lim, i) => (
            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
              <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
              <span>{lim}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Dataset attribution */}
      <div className="card mb-6">
        <h3 className="section-title">Dataset Attribution</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>LUNA16 Challenge:</strong> The LUNA16 dataset is derived from LIDC-IDRI and provides nodule candidate locations.</p>
          <p><strong>LIDC-IDRI:</strong> The Lung Image Database Consortium image collection is hosted by The Cancer Imaging Archive (TCIA).</p>
          <p><strong>Kaggle mirror:</strong> A mirror by user sutrisna98 is available on Kaggle.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <p className="text-amber-800 text-sm">
              <strong>License notice:</strong> You must verify the dataset license and terms of use at{' '}
              <a
                href="https://luna16.grand-challenge.org/Data/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-amber-900 hover:text-amber-700"
              >
                https://luna16.grand-challenge.org/Data/
              </a>{' '}
              before using this tool with real data.
            </p>
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="card">
        <h3 className="section-title">Proposed Next-Year Roadmap</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 px-3">Feature</th>
              <th className="py-2 px-3">Data Requirements</th>
              <th className="py-2 px-3">Risks</th>
            </tr>
          </thead>
          <tbody>
            {roadmap.map((r, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-3 font-medium">{r.item}</td>
                <td className="py-2 px-3 text-gray-600">{r.dataReq}</td>
                <td className="py-2 px-3 text-gray-600">{r.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}
