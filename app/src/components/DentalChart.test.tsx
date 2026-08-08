import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DentalChart from './DentalChart';
import { KEZELES_VIZUALOK } from '../design/treatmentVisuals';
import type { FogterkepAllapot, FogVizualisAllapot } from '../domain/toothVisual';

function makeAllapot(fogak: Record<string, keyof typeof KEZELES_VIZUALOK>): FogterkepAllapot {
  const map = new Map<string, FogVizualisAllapot>();
  for (const [fdi, vizual] of Object.entries(fogak)) {
    map.set(fdi, { fdi, vizual, kezelesek: [] });
  }
  return { fogak: map, tejfogak: [], ismeretlen: [], hianyzoTetel: false, jelmagyarazat: [] };
}

describe('DentalChart', () => {
  it('a 11-es fogra kapott kezelés a megfelelő szín-szabályt injektálja a fog elemére', () => {
    const allapot = makeAllapot({ '11': 'KORONA' });
    const { container } = render(<DentalChart allapot={allapot} />);

    expect(container.querySelector('[data-tooth="11"]')).toBeInTheDocument();
    const styleText = container.querySelector('style')?.textContent ?? '';
    expect(styleText).toContain(`#tooth-11{color:${KEZELES_VIZUALOK.KORONA.szin}}`);
  });

  it('kezeletlen fogon nincs felülíró szabály -- az eredeti asset fehérje marad', () => {
    const allapot = makeAllapot({ '11': 'KORONA' });
    const { container } = render(<DentalChart allapot={allapot} />);

    const styleText = container.querySelector('style')?.textContent ?? '';
    expect(styleText).not.toContain('#tooth-12{color:');
  });

  it('onToothClick nélkül a kattintás nem vált ki interakciót (readonly/PDF mód)', async () => {
    const user = userEvent.setup();
    const allapot = makeAllapot({ '11': 'KORONA' });
    const { container } = render(<DentalChart allapot={allapot} />);

    const tooth = container.querySelector('[data-tooth="11"]') as Element;
    await user.click(tooth); // nem dobhat hibát

    const root = screen.getByRole('img', { name: /Fogászati kezelési terv/ });
    expect(root).toHaveStyle({ cursor: 'default' });
  });

  it('onToothClick megadásakor a kattintott fog FDI-kódja érkezik a callbackbe', async () => {
    const user = userEvent.setup();
    const onToothClick = vi.fn();
    const allapot = makeAllapot({ '11': 'KORONA' });
    const { container } = render(<DentalChart allapot={allapot} onToothClick={onToothClick} />);

    const tooth = container.querySelector('[data-tooth="11"]') as Element;
    await user.click(tooth);

    expect(onToothClick).toHaveBeenCalledWith('11');
  });
});
