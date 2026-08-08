// Kétállású (vagy több) szegmentált kapcsoló -- Radix SegmentedControl-ra
// építve (docs/07-felulet-rendszer.md "Minden UI elem @radix-ui/themes
// komponensből jön").
// Közös komponens, mert a Páciens adatlap (nyelv/pénznem) és a Beállítások
// (alapértelmezett nyelv) is ugyanezt a mintát használja.

import { SegmentedControl } from '@radix-ui/themes';

export default function ChipGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
}) {
  return (
    <SegmentedControl.Root value={value} onValueChange={(v) => onChange(v as T)} size="1">
      {options.map(([v, label]) => (
        <SegmentedControl.Item key={v} value={v}>
          {label}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl.Root>
  );
}
