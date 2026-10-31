import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ToastProvider } from './components/ToastContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
const Home = lazy(() => import('./pages/Home.jsx'));
const CreateMystery = lazy(() => import('./pages/CreateMystery.jsx'));
const CaseFiles = lazy(() => import('./pages/CaseFiles.jsx'));
const Investigation = lazy(() => import('./pages/Investigation.jsx'));
const Accusation = lazy(() => import('./pages/Accusation.jsx'));
const Results = lazy(() => import('./pages/Results.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
function Loading() {
  return (
    <main className="center-state">
      <span className="spinner" aria-label="Loading" />
    </main>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Layout>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateMystery />} />
              <Route path="/cases" element={<CaseFiles />} />
              <Route path="/case/:caseId" element={<Investigation />} />
              <Route path="/case/:caseId/accuse" element={<Accusation />} />
              <Route path="/case/:caseId/result" element={<Results />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </ToastProvider>
    </ErrorBoundary>
  );
}
