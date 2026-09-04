// Egység-teszt a megosztott "Mentve ✓" jelző-primitívre -- a négy meglévő
// hívási hely (RendeloTab/EgyebTab/NyomtatvanyokTab/KategoriaPanel) és az
// árlista tétel-sorok viselkedését a saját tesztjeik fedik (SettingsPage.test.tsx,
// PriceListAdminPage.test.tsx), ez a fájl kizárólag a primitívet magát --
// unmount-takarítással együtt, ami a másolat-beillesztett elődökből hiányzott.

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMentesJelzo } from './useMentesJelzo';

describe('useMentesJelzo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sikeres `futtat` után kigyullad, majd az időzítés leteltével elalszik', async () => {
    const { result } = renderHook(() => useMentesJelzo(2000));

    await act(async () => {
      await result.current.futtat(async () => true);
    });
    expect(result.current.saved).toBe(true);
    expect(result.current.saving).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.saved).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.saved).toBe(false);
  });

  it('`futtat` alatt `saving` igaz, a művelet lefutása után hamis', async () => {
    const { result } = renderHook(() => useMentesJelzo());
    let resolveMuvelet!: (v: boolean) => void;
    const muvelet = new Promise<boolean>((resolve) => {
      resolveMuvelet = resolve;
    });

    let futtatPromise!: Promise<boolean>;
    act(() => {
      futtatPromise = result.current.futtat(() => muvelet);
    });
    expect(result.current.saving).toBe(true);

    await act(async () => {
      resolveMuvelet(true);
      await futtatPromise;
    });
    expect(result.current.saving).toBe(false);
    expect(result.current.saved).toBe(true);
  });

  it('`false`-t adó `futtat` nem gyújtja ki a jelzést', async () => {
    const { result } = renderHook(() => useMentesJelzo());

    await act(async () => {
      const ok = await result.current.futtat(async () => false);
      expect(ok).toBe(false);
    });
    expect(result.current.saved).toBe(false);
  });

  it('dobott hiba esetén a jelzés elalszik, és a hiba TOVÁBB SZÁLL a hívóhoz', async () => {
    const { result } = renderHook(() => useMentesJelzo());

    // Előbb kigyújtjuk, hogy lássuk: egy utána dobott hiba tényleg eloltja.
    await act(async () => {
      await result.current.futtat(async () => true);
    });
    expect(result.current.saved).toBe(true);

    let elkapottHiba: unknown;
    await act(async () => {
      try {
        await result.current.futtat(async () => {
          throw new Error('kvótahiba');
        });
      } catch (err) {
        elkapottHiba = err;
      }
    });
    expect(elkapottHiba).toBeInstanceOf(Error);
    expect((elkapottHiba as Error).message).toBe('kvótahiba');
    expect(result.current.saved).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('minden `jelez()` újraindítja az órát -- gyors, egymást követő hívásoknál a felirat NEM villan el a kettő között', () => {
    const { result } = renderHook(() => useMentesJelzo(2000));

    act(() => {
      result.current.jelez();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.saved).toBe(true);

    act(() => {
      result.current.jelez();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // Az első időzítő (ami 500 ms múlva lejárt volna) nem oltotta el a jelzést.
    expect(result.current.saved).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.saved).toBe(false);
  });

  it('`olts()` azonnal elalusztja a jelzést', () => {
    const { result } = renderHook(() => useMentesJelzo());

    act(() => {
      result.current.jelez();
    });
    expect(result.current.saved).toBe(true);

    act(() => {
      result.current.olts();
    });
    expect(result.current.saved).toBe(false);
  });

  it('`felirat()` a saving/saved állapot szerint vált, a gombfeliratos hívók mintája', () => {
    const { result } = renderHook(() => useMentesJelzo());

    expect(result.current.felirat('Mentés')).toBe('Mentés');

    act(() => {
      result.current.jelez();
    });
    expect(result.current.felirat('Mentés')).toBe('Mentve ✓');
  });

  it('unmountkor takarítja az időzítőt -- nem állít state-et egy már eltűnt komponensen', () => {
    const setStateSpy = vi.spyOn(console, 'error');
    const { result, unmount } = renderHook(() => useMentesJelzo(1000));

    act(() => {
      result.current.jelez();
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(setStateSpy).not.toHaveBeenCalled();
    setStateSpy.mockRestore();
  });
});
