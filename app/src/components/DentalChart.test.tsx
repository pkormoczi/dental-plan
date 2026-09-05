import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DentalChart from './DentalChart';
import { CHART_WRAPPER_CLASS } from '../design/toothChartSvg';
import type { KategoriaVizual } from '../design/treatmentVisuals';
import type { FogterkepAllapot, FogVizualisAllapot } from '../domain/toothVisual';

const KORONA_VIZUAL: KategoriaVizual = {
  id: 'k10',
  nev: { hu: 'Korona és híd', de: 'Krone und Brücke' },
  szin: '#4dabf7',
  sorrend: 4,
};

function makeAllapot(fogak: Record<string, KategoriaVizual>): FogterkepAllapot {
  const map = new Map<string, FogVizualisAllapot>();
  for (const [fdi, vizual] of Object.entries(fogak)) {
    map.set(fdi, { fdi, vizual, kezelesek: [] });
  }
  return { fogak: map, tejfogak: [], ismeretlen: [], hianyzoTetel: false, jelmagyarazat: [] };
}

describe('DentalChart', () => {
  it('a 11-es fogra kapott kezelés a megfelelő szín-szabályt injektálja a fog elemére', () => {
    const allapot = makeAllapot({ '11': KORONA_VIZUAL });
    const { container } = render(<DentalChart allapot={allapot} />);

    expect(container.querySelector('[data-tooth="11"]')).toBeInTheDocument();
    const styleText = container.querySelector('style')?.textContent ?? '';
    expect(styleText).toContain(`#tooth-11{color:${KORONA_VIZUAL.szin}}`);
  });

  it('kezeletlen fogon nincs felülíró szabály -- az eredeti asset fehérje marad', () => {
    const allapot = makeAllapot({ '11': KORONA_VIZUAL });
    const { container } = render(<DentalChart allapot={allapot} />);

    const styleText = container.querySelector('style')?.textContent ?? '';
    expect(styleText).not.toContain('#tooth-12{color:');
  });

  it('onToothClick nélkül a kattintás nem vált ki interakciót (readonly/PDF mód)', async () => {
    const user = userEvent.setup();
    const allapot = makeAllapot({ '11': KORONA_VIZUAL });
    const { container } = render(<DentalChart allapot={allapot} />);

    const tooth = container.querySelector('[data-tooth="11"]') as Element;
    await user.click(tooth); // nem dobhat hibát

    const root = screen.getByRole('img', { name: /Fogászati kezelési terv/ });
    expect(root).toHaveStyle({ cursor: 'default' });
    expect(root).not.toHaveClass(CHART_WRAPPER_CLASS);
  });

  it('onToothClick megadásakor a kattintott fog FDI-kódja érkezik a callbackbe', async () => {
    const user = userEvent.setup();
    const onToothClick = vi.fn();
    const allapot = makeAllapot({ '11': KORONA_VIZUAL });
    const { container } = render(<DentalChart allapot={allapot} onToothClick={onToothClick} />);

    const tooth = container.querySelector('[data-tooth="11"]') as Element;
    await user.click(tooth);

    expect(onToothClick).toHaveBeenCalledWith('11');
  });

  describe('billentyűzet -- a teljes terv felvihető egérhasználat nélkül', () => {
    it('onToothClick esetén role="toolbar", EGY tabIndex, aria-activedescendant az első fogon (18) indul, a wrapper a fókuszgyűrű classt hordozza', () => {
      render(<DentalChart allapot={makeAllapot({})} onToothClick={vi.fn()} />);
      const root = screen.getByRole('toolbar');
      expect(root).toHaveAttribute('tabindex', '0');
      expect(root).toHaveAttribute('aria-activedescendant', 'tooth-18');
      expect(root).toHaveClass(CHART_WRAPPER_CLASS);
    });

    it('ArrowRight a felső állcsonton belül lép, ArrowLeft a szélen NEM ugrik körbe (18/28 nem szomszédos fog)', async () => {
      const user = userEvent.setup();
      render(<DentalChart allapot={makeAllapot({})} onToothClick={vi.fn()} />);
      const root = screen.getByRole('toolbar');
      root.focus();

      await user.keyboard('{ArrowRight}');
      expect(root).toHaveAttribute('aria-activedescendant', 'tooth-17');

      await user.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(root).toHaveAttribute('aria-activedescendant', 'tooth-18'); // a szélen marad, nem 28-ra ugrik
    });

    it('End a felső állcsont utolsó fogára (28) viszi, ArrowDown ugyanabba az oszlopba az alsó állcsonton (anatómiai szemközti fog: 48)', async () => {
      const user = userEvent.setup();
      render(<DentalChart allapot={makeAllapot({})} onToothClick={vi.fn()} />);
      const root = screen.getByRole('toolbar');
      root.focus();

      await user.keyboard('{End}');
      expect(root).toHaveAttribute('aria-activedescendant', 'tooth-28');

      await user.keyboard('{Home}');
      expect(root).toHaveAttribute('aria-activedescendant', 'tooth-18');

      await user.keyboard('{ArrowDown}');
      expect(root).toHaveAttribute('aria-activedescendant', 'tooth-48');
    });

    it('Enter és szóköz is a jelenleg aktív fogra hívja az onToothClick-et, kattintás nélkül', async () => {
      const user = userEvent.setup();
      const onToothClick = vi.fn();
      render(<DentalChart allapot={makeAllapot({})} onToothClick={onToothClick} />);
      const root = screen.getByRole('toolbar');
      root.focus();

      await user.keyboard('{ArrowRight}{Enter}');
      expect(onToothClick).toHaveBeenLastCalledWith('17');

      await user.keyboard(' ');
      expect(onToothClick).toHaveBeenLastCalledWith('17');
    });

    it('kattintás egy fogra a billentyűzetes kurzort is odaviszi (aria-activedescendant frissül)', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <DentalChart allapot={makeAllapot({})} onToothClick={vi.fn()} />,
      );
      const root = screen.getByRole('toolbar');
      const tooth = container.querySelector('[data-tooth="36"]') as Element;

      await user.click(tooth);

      expect(root).toHaveAttribute('aria-activedescendant', 'tooth-36');
    });
  });

  describe('szerep="option" + selectedTeeth (soron belüli választó -- role="listbox")', () => {
    it('szerep="option" esetén role="listbox", aria-multiselectable="true", a kijelölt fog aria-selected="true"', () => {
      render(
        <DentalChart
          allapot={makeAllapot({})}
          onToothClick={vi.fn()}
          szerep="option"
          selectedTeeth={['16']}
        />,
      );
      const root = screen.getByRole('listbox');
      expect(root).toHaveAttribute('aria-multiselectable', 'true');
      const tooth = root.querySelector('[data-tooth="16"]') as Element;
      expect(tooth).toHaveAttribute('aria-selected', 'true');
      expect(tooth).toHaveAttribute('role', 'option');
      expect(tooth).not.toHaveAttribute('aria-pressed');
    });

    it('a billentyűzetes kurzor a kijelölt fogak közül az elsőn indul, ha van kijelölés', () => {
      render(
        <DentalChart
          allapot={makeAllapot({})}
          onToothClick={vi.fn()}
          szerep="option"
          selectedTeeth={['24']}
        />,
      );
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-activedescendant', 'tooth-24');
    });
  });

  describe('alapértelmezett szerep="button" + selectedTeeth (Terv részletei -- több fogas kijelölés-navigáció)', () => {
    it('marad role="toolbar", a kijelölt fog aria-pressed="true"-t kap, aria-selected NÉLKÜL', () => {
      render(
        <DentalChart allapot={makeAllapot({})} onToothClick={vi.fn()} selectedTeeth={['16']} />,
      );
      const root = screen.getByRole('toolbar');
      const tooth = root.querySelector('[data-tooth="16"]') as Element;
      expect(tooth).toHaveAttribute('role', 'button');
      expect(tooth).toHaveAttribute('aria-pressed', 'true');
      expect(tooth).not.toHaveAttribute('aria-selected');
      const masikFog = root.querySelector('[data-tooth="17"]') as Element;
      expect(masikFog).toHaveAttribute('aria-pressed', 'false');
    });

    it('selectedTeeth nélkül (a szerkesztő plan-szintű térképe) NINCS aria-pressed -- a markup bájtra változatlan', () => {
      render(<DentalChart allapot={makeAllapot({})} onToothClick={vi.fn()} />);
      const root = screen.getByRole('toolbar');
      const tooth = root.querySelector('[data-tooth="16"]') as Element;
      expect(tooth).not.toHaveAttribute('aria-pressed');
    });
  });
});
