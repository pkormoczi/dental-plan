import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Box, Flex, Skeleton, Theme } from '@radix-ui/themes';
import DemoBanner from './components/DemoBanner';
import ErrorBoundary from './components/ErrorBoundary';
import NavBar from './components/NavBar';
import { NavGuardProvider } from './components/NavGuardContext';
import TervWorkflowShell from './components/TervWorkflowShell';
import { t } from './design/tokens';
import DemoPage from './pages/DemoPage';
import Home from './pages/Home';
import NewPlanPage from './pages/NewPlanPage';
import PaciensekPage from './pages/PaciensekPage';
import PatientDetailPage from './pages/PatientDetailPage';
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
    // Theme legkívül -- a Radix portál-komponensek (Select, AlertDialog stb.)
    // a portáljuk tartalmát egy belső <Theme> újrainjektálással csomagolják,
    // ami hiba nélkül csak akkor működik, ha VAN ambiens Theme kontextus a
    // fán -- ezért ErrorBoundary is ezen belül van, ne kívül.

    // `accentColor="brown"` ellenére a `solid` Button és a Select kiemelt sora
    // majdnem fekete (`ink`): a barna step-9 fehér felirattal 3,53:1 volt, az
    // accent-aliast `index.css` írja felül (K2) -- ne itt keresd.
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      {/* Legkívül -- ez a StorageProvider/AppStateProvider betöltési hibáit is
          elkapja (P1-1), nem csak a lapok render-idejű kivételeit. */}
      <ErrorBoundary>
        <StorageProvider>
          <AppStateProvider>
            {/* NavBar-t ÉS a route-olt lapokat is le kell fednie -- a
                D38-védett felületek (PatientDetailPage, SettingsPage) a
                NavBar-ral megosztott "van piszkozat" jelzőt ezen keresztül
                érik el (D46). */}
            <NavGuardProvider>
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
                        <Route path="/uj-terv" element={<NewPlanPage />} />
                        {/* Terv-workflow héj (backlog-31, D36) -- az app első
                            layout-route-ja: a breadcrumb+stepper a három lépés
                            köré épül, az Outlet rendereli a tényleges oldalt. */}
                        <Route element={<TervWorkflowShell />}>
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
                        </Route>
                        <Route path="/tervek" element={<PlanHistoryPage />} />
                        <Route path="/paciensek" element={<PaciensekPage />} />
                        <Route path="/paciensek/:patientDir" element={<PatientDetailPage />} />
                        <Route path="/arlista" element={<PriceListAdminPage />} />
                        <Route path="/beallitasok" element={<SettingsPage />} />
                        <Route path="/demo" element={<DemoPage />} />
                      </Routes>
                    </ErrorBoundary>
                  </main>
                </div>
              </HashRouter>
            </NavGuardProvider>
          </AppStateProvider>
        </StorageProvider>
      </ErrorBoundary>
    </Theme>
  );
}

// docs/07-felulet-rendszer.md: skeleton a végleges elrendezés alakjában, ne
// pörgő spinner -- a PreviewPage saját (checkbox+gombsor, majd egy nagy
// keretes doboz) elrendezését közelíti, hogy ne ugorjon a réteg, amikor a
// lazy chunk (@react-pdf/renderer, ~1.5 MB) betöltése után a valódi tartalom
// átveszi a helyét.
function PreviewLoading() {
  return (
    <>
      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
        <Skeleton>
          <Box height="20px" width="260px" />
        </Skeleton>
        <Flex gap="3">
          <Skeleton>
            <Box height="32px" width="90px" />
          </Skeleton>
          <Skeleton>
            <Box height="32px" width="170px" />
          </Skeleton>
        </Flex>
      </Flex>
      <Skeleton>
        <Box style={{ width: '100%', height: '80vh', borderRadius: t.radiusLg }} />
      </Skeleton>
    </>
  );
}
