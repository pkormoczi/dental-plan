import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import DemoBanner from './components/DemoBanner';
import ErrorBoundary from './components/ErrorBoundary';
import NavBar from './components/NavBar';
import { t } from './design/tokens';
import Home from './pages/Home';
import PatientPage from './pages/PatientPage';
import PlanEditorPage from './pages/PlanEditorPage';
import PlanHistoryPage from './pages/PlanHistoryPage';
import PriceListAdminPage from './pages/PriceListAdminPage';
import SettingsPage from './pages/SettingsPage';
import { AppStateProvider } from './state/AppState';
import { StorageProvider } from './storage/StorageContext';

// @react-pdf/renderer önmagában ~1.5 MB -- csak akkor töltse be a böngésző,
// amikor a doki ténylegesen megnyitja az előnézetet, ne minden oldalon.
const PreviewPage = lazy(() => import('./pages/PreviewPage'));

export default function App() {
  return (
    // Legkívül -- ez a StorageProvider/AppStateProvider betöltési hibáit is
    // elkapja (P1-1), nem csak a lapok render-idejű kivételeit.
    <ErrorBoundary>
      <StorageProvider>
        <AppStateProvider>
          <HashRouter>
            <div style={{ minHeight: '100vh', background: t.page }}>
              <DemoBanner />
              <NavBar />
              <main style={{ padding: 24, fontFamily: t.font, color: t.text }}>
                {/* Külön boundary a Routes körül: egy oldal hibája ne vigye
                    el a NavBart is -- a doki így el tud navigálni máshova. */}
                <ErrorBoundary title="Hiba történt ezen az oldalon">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/paciens" element={<PatientPage />} />
                    <Route path="/terv" element={<PlanEditorPage />} />
                    <Route
                      path="/elonezet"
                      element={
                        <Suspense fallback={<PreviewLoading />}>
                          <PreviewPage />
                        </Suspense>
                      }
                    />
                    <Route path="/tervek" element={<PlanHistoryPage />} />
                    <Route path="/arlista" element={<PriceListAdminPage />} />
                    <Route path="/beallitasok" element={<SettingsPage />} />
                  </Routes>
                </ErrorBoundary>
              </main>
            </div>
          </HashRouter>
        </AppStateProvider>
      </StorageProvider>
    </ErrorBoundary>
  );
}

function PreviewLoading() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
      Az előnézet-motor betöltése…
    </div>
  );
}
