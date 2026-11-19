import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RegiDemoCim from './RegiDemoCim';

function HolVagyunk() {
  const location = useLocation();
  return <div data-testid="cel">{`${location.pathname}${location.search}`}</div>;
}

function renderRegiCim(cim: string) {
  return render(
    <MemoryRouter initialEntries={[cim]}>
      <Routes>
        <Route path="/demo" element={<RegiDemoCim />} />
        <Route path="/demo/:tab" element={<RegiDemoCim />} />
        <Route path="*" element={<HolVagyunk />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegiDemoCim', () => {
  it.each([
    ['/demo', '/sugo'],
    ['/demo/funkciok', '/sugo'],
    ['/demo/valtozasnaplo', '/sugo/valtozasnaplo'],
    ['/demo/tervek', '/tervek'],
    ['/demo/filerendszer', '/beallitasok?tab=filerendszer'],
    ['/demo/adatkezeles', '/beallitasok?tab=adatkezeles'],
    ['/demo/nincsilyen', '/sugo'],
    ['/demo/constructor', '/sugo'],
  ])('a régi %s cím a(z) %s helyre visz', async (regi, uj) => {
    renderRegiCim(regi);
    expect(await screen.findByTestId('cel')).toHaveTextContent(uj);
  });
});
