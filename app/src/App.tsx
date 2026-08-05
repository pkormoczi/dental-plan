import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import DemoBanner from './components/DemoBanner';
import NavBar from './components/NavBar';
import { t } from './design/tokens';
import Home from './pages/Home';
import Placeholder from './pages/Placeholder';
import PlanEditorPage from './pages/PlanEditorPage';
import PriceListAdminPage from './pages/PriceListAdminPage';
import { AppStateProvider } from './state/AppState';
import { StorageProvider } from './storage/StorageContext';

// @react-pdf/renderer önmagában ~1.5 MB -- csak akkor töltse be a böngésző,
// amikor a doki ténylegesen megnyitja az előnézetet, ne minden oldalon.
const PreviewPage = lazy(() => import('./pages/PreviewPage'));

export default function App() {
  return (
    <StorageProvider>
      <AppStateProvider>
        <HashRouter>
          <div style={{ minHeight: '100vh', background: t.page }}>
            <DemoBanner />
            <NavBar />
            <main style={{ padding: 24, fontFamily: t.font, color: t.text }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/paciens" element={<Placeholder title="Páciens adatlap" />} />
                <Route path="/terv" element={<PlanEditorPage />} />
                <Route
                  path="/elonezet"
                  element={
                    <Suspense fallback={<PreviewLoading />}>
                      <PreviewPage />
                    </Suspense>
                  }
                />
                <Route path="/tervek" element={<Placeholder title="Korábbi tervek" />} />
                <Route path="/arlista" element={<PriceListAdminPage />} />
                <Route path="/beallitasok" element={<Placeholder title="Beállítások" />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </AppStateProvider>
    </StorageProvider>
  );
}

function PreviewLoading() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
      Az előnézet-motor betöltése…
    </div>
  );
}
