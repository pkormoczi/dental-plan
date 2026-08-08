// P1-1: eddig sehol nem volt Error Boundary -- bármilyen render-időbeli
// kivétel fehér oldalt eredményezett, visszalépési lehetőség nélkül. Két
// helyen kerül be az App.tsx-be: legkívül (a StorageProvider fölött, hogy a
// provider-hibákat is elkapja) és a <Routes> köré (hogy egy oldal hibája ne
// vigye el a NavBart -- a doki el tudjon navigálni másik oldalra).
//
// Class komponens, mert a componentDidCatch-nek nincs hook-megfelelője.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../design/tokens';

interface Props {
  children: ReactNode;
  /** Testreszabható címsor, hogy a beágyazott (Routes körüli) boundary üzenete eltérjen a legkülsőtől. */
  title?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary elkapott hiba:', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  private goHome = (): void => {
    window.location.hash = '#/';
    this.reset();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: t.danger, marginBottom: 8 }}>
          {this.props.title ?? 'Váratlan hiba történt'}
        </div>
        <div style={{ fontSize: 13, color: t.uiTextMuted, marginBottom: 4 }}>
          Az alkalmazás egy része hibába futott. Az eddig be nem mentett adatok elveszhetnek, de a
          korábban mentett tervek nem sérültek.
        </div>
        <div
          style={{
            fontSize: 12,
            color: t.uiTextFaint,
            fontFamily: t.mono,
            marginTop: 10,
            marginBottom: 18,
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button style={btnPrimary} onClick={this.goHome}>
            Vissza a kezdőlapra
          </button>
          <button style={btnSecondary} onClick={() => window.location.reload()}>
            Oldal újratöltése
          </button>
        </div>
      </div>
    );
  }
}

const btnPrimary = {
  height: 34,
  fontSize: 13,
  padding: '0 14px',
  borderRadius: t.radius,
  cursor: 'pointer',
  fontFamily: 'inherit',
  border: `1px solid ${t.ink}`,
  background: t.ink,
  color: t.onBrand,
} as const;

const btnSecondary = {
  ...btnPrimary,
  background: t.surface,
  color: t.text,
  border: `1px solid ${t.controlBorder}`,
} as const;
