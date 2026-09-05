// Kétállású (vagy több) szegmentált kapcsoló -- Radix SegmentedControl-ra
// építve (Radix az egyetlen UI-lib, lásd app/src/CLAUDE.md).
// Közös komponens, mert a Terv adatai lap (nyelv/pénznem) és a Beállítások
// (alapértelmezett nyelv) is ugyanezt a mintát használja.

import { SegmentedControl } from '@radix-ui/themes';

export default function ChipGroup<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
  /** A hívók többsége egy `FieldGroup` címkéje alatt áll -- csak ott kell, ahol nincs. */
  ariaLabel?: string;
}) {
  return (
    <SegmentedControl.Root
      value={value}
      onValueChange={(v) => onChange(v as T)}
      size="1"
      aria-label={ariaLabel}
    >
      {options.map(([v, label]) => (
        <SegmentedControl.Item key={v} value={v}>
          {label}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl.Root>
  );
}
