// Ideiglenes állapotjelző azokhoz a képernyőkhöz, amik a build-lépések
// sorrendjében még nincsenek megépítve. Minden Placeholder-t lecserél egy
// dedikált komponens, mielőtt a mockup készen áll.

import { t } from '../design/tokens';

export default function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 15, color: t.textMuted }}>{title} — hamarosan.</div>
    </div>
  );
}
