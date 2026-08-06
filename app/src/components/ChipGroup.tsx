// Kétállású (vagy több) szegmentált kapcsoló -- a PriceListAdminPage
// szűrő-chipjeinek mintája (chip stílus + t.skyWash/t.navy a kiválasztotton).
// Közös komponens, mert a Páciens adatlap (nyelv/pénznem) és a Beállítások
// (alapértelmezett nyelv) is ugyanezt a mintát használja.

import { t } from '../design/tokens';
import { chip } from '../design/ui';

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
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={{
            ...chip,
            background: value === v ? t.skyWash : t.surface,
            borderColor: value === v ? t.navy : t.line,
            color: value === v ? t.navy : t.textMuted,
            fontWeight: value === v ? 600 : 400,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
