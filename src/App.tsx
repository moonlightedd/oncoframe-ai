import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import Layout from '@/components/Layout';
import DatasetAudit from '@/pages/DatasetAudit';

const DataDictionary = lazy(() => import('@/pages/DataDictionary'));
const CandidateExplorer = lazy(() => import('@/pages/CandidateExplorer'));
const TrainModels = lazy(() => import('@/pages/TrainModels'));
const Evaluation = lazy(() => import('@/pages/Evaluation'));
const Explainability = lazy(() => import('@/pages/Explainability'));
const ErrorAnalysis = lazy(() => import('@/pages/ErrorAnalysis'));
const Predict = lazy(() => import('@/pages/Predict'));
const Limitations = lazy(() => import('@/pages/Limitations'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DatasetAudit />} />
            <Route path="/dictionary" element={<Suspense fallback={<PageLoader />}><DataDictionary /></Suspense>} />
            <Route path="/explorer" element={<Suspense fallback={<PageLoader />}><CandidateExplorer /></Suspense>} />
            <Route path="/train" element={<Suspense fallback={<PageLoader />}><TrainModels /></Suspense>} />
            <Route path="/evaluation" element={<Suspense fallback={<PageLoader />}><Evaluation /></Suspense>} />
            <Route path="/explainability" element={<Suspense fallback={<PageLoader />}><Explainability /></Suspense>} />
            <Route path="/error-analysis" element={<Suspense fallback={<PageLoader />}><ErrorAnalysis /></Suspense>} />
            <Route path="/predict" element={<Suspense fallback={<PageLoader />}><Predict /></Suspense>} />
            <Route path="/limitations" element={<Suspense fallback={<PageLoader />}><Limitations /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
