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
                <Route path="/elonezet" element={<Placeholder title="Előnézet" />} />
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
