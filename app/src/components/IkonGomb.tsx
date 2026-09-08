// Felirat nélküli ikon-gomb + tooltip EGY komponensben. Az `aria-label` csak a
// képernyőolvasónak szól: az egérrel dolgozó doki kattintás előtt nem tudta
// meg, mit tesz a gomb. Wrapper, nem hívóhelyenkénti `Tooltip` -- így lintből
// (`.oxlintrc.json` `no-restricted-imports`, `IconButton`) őrizhető, hogy
// felirat nélküli ikon-gomb tooltip nélkül ne keletkezhessen; 33 hívóhelyen ez
// különben elfelejthető maradna.
//
// Az `aria-label` marad az akadálymentes NÉV (alapból a `cimke`), a tooltip
// `aria-describedby`-ként jön mellé -- nem cseréljük le, mert a sornév-előtagos
// labelekre (árlista csillag/szem, „⋯" menü) tesztek épülnek; ahol a
// felolvasónak több kontextus kell, mint a tooltipnek, ott `ariaLabel` írja
// felül.
//
// Letiltott gombnál a `<span>` a tooltip triggere: a letiltott gomb nem kap
// egérmozgás-eseményt, a Radix Tooltip így sosem nyílna -- épp ott, ahol a
// hiányzó magyarázat ára a legnagyobb. A span nem kap `tabIndex`-et, tehát nem
// lesz új Tab-megálló: letiltott gombnál a tooltip egér-only, ez tudatos.

import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { IconButton, Tooltip } from '@radix-ui/themes';

type IconButtonProps = ComponentPropsWithoutRef<typeof IconButton>;

export interface IkonGombProps extends Omit<IconButtonProps, 'aria-label' | 'title'> {
  /** A tooltip szövege ÉS az alapértelmezett `aria-label`. */
  cimke: string;
  /** Csak ott, ahol a képernyőolvasónak több kontextus kell, mint a tooltipnek. */
  ariaLabel?: string;
}

const IkonGomb = forwardRef<HTMLButtonElement, IkonGombProps>(function IkonGomb(
  { cimke, ariaLabel, ...rest },
  ref,
) {
  const gomb = <IconButton ref={ref} aria-label={ariaLabel ?? cimke} {...rest} />;
  return (
    <Tooltip content={cimke}>
      {rest.disabled ? <span style={{ display: 'inline-flex' }}>{gomb}</span> : gomb}
    </Tooltip>
  );
});

export default IkonGomb;
