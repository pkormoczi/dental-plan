// „<Név> felvéve” -- a quick-create dialógus sikeres mentése után a
// célképernyő fogadja a dokit ezzel, hogy a felvitel megtörténtét ne
// kelljen a lista/mezők átolvasásából kikövetkeztetnie.
//
// A jelzés a MEGLÉVŐ `location.state`-mintára épül (mint a `tab`/`mod` a
// PatientDetailPage-en), nem új globális toast-rendszerre: mindkét
// célképernyő már `navigate(..., { state })`-tel érkezik. A fogadó oldal
// -- ugyanazzal a doktrínával, mint a `tab`/`mod` -- KIZÁRÓLAG a kezdőérték
// kiolvasásához nyúl a state-hez, ezért a jelzés egy újabb, jelzés nélküli
// érkezéskor magától eltűnik.

import { Callout } from '@radix-ui/themes';
import { CheckCircledIcon } from '@radix-ui/react-icons';

/** A navigációs state kulcsa -- a küldő és a fogadó oldal egyetlen közös pontja. */
export interface PaciensFelvetelState {
  felvettNev?: string;
}

export function felvettNevAllapotbol(state: unknown): string | null {
  const nev = (state as PaciensFelvetelState | null)?.felvettNev;
  return typeof nev === 'string' && nev.trim() ? nev : null;
}

export function PaciensFelvetelJelzo({ nev }: { nev: string | null }) {
  if (!nev) return null;
  return (
    <Callout.Root color="green" size="1" mb="3">
      <Callout.Icon>
        <CheckCircledIcon />
      </Callout.Icon>
      <Callout.Text>{nev} felvéve</Callout.Text>
    </Callout.Root>
  );
}
