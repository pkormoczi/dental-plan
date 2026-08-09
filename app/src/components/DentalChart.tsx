// Interaktív/olvasható fogtérkép -- a dental-chart-fdi-32.svg anatómiai
// rajzát színezi kezelési kategóriánként (design/toothChartSvg.ts). Ugyanez
// a markup-builder szolgáltatja a nyomtatvány fogtérképét is (canvas->PNG
// adapter, lásd pdf/toothChartImage.ts), így nincs két külön "melyik fog
// milyen színű" logika a két felületen.
//
// docs/07-felulet-rendszer.md kifejezett kivétele a Radix-only szabály alól:
// "a fogtérkép (funkcionális SVG adatvizualizáció) és a nyomtatvány".
//
// Billentyűzet (docs/07-felulet-rendszer.md "Billentyűzet" -- "A teljes terv
// felvihető egérhasználat nélkül"): NEM a 32 fog kap egyenként fókuszt --
// az 32 Tab-megállót jelentene, és a `dangerouslySetInnerHTML` minden
// `allapot`-változáskor (pl. egy leütés a Fog mezőben) kicseréli a teljes
// befecskendezett DOM-ot, ami elvesztené a fókuszt egy DOM-elemre kötve.
// Helyette EGY Tab-megálló a wrapperen (`tabIndex=0`), `aria-activedescendant`
// mutat az aktív fogra (`id="tooth-NN"`, ez a wrapper-en KÍVÜLI DOM-cserét is
// túléli, mert maga a wrapper elem sosem cserélődik, csak a gyereke). A
// nyílbillentyűk a `FDI_MARADO` (16 felső + 16 alsó, anatómiai balról-jobbra
// sorrend) tömbön lépkednek.

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { FDI_MARADO, type FogterkepAllapot } from '../domain/toothVisual';
import { buildToothChartSvg, CHART_ARIA_LABEL } from '../design/toothChartSvg';

const JAW_LEN = 16;

export interface DentalChartProps {
  allapot: FogterkepAllapot;
  /** Fejlesztői/debug mód: fogszám minden fog közepén. Alapból kikapcsolva. */
  showToothNumbers?: boolean;
  /** Ha nincs megadva, a fogtérkép teljesen olvasható-only (nincs kattintás/billentyűzet). */
  onToothClick?: (toothNumber: string) => void;
  /**
   * CSAK a soron belüli választónál (ToothPickerPopover) add meg: ezek a
   * fogak vannak kijelölve EBBEN a sorban -- ilyenkor a fogtérkép
   * `role="listbox"`/`aria-multiselectable` szerepű, minden fog `option`,
   * kijelölés-gyűrűvel. Ha nincs megadva (`undefined`), de van
   * `onToothClick`, a fogtérkép `role="toolbar"` -- a terv szintű
   * fogtérkép esete (sorugrás / új sor, nincs többszörös kijelölés).
   */
  selectedTeeth?: readonly string[];
}

export default function DentalChart({
  allapot,
  showToothNumbers = false,
  onToothClick,
  selectedTeeth,
}: DentalChartProps) {
  const interactive = !!onToothClick;
  const listbox = interactive && selectedTeeth !== undefined;

  const [aktivFog, setAktivFog] = useState(() => {
    const elsoKijelolt = selectedTeeth?.find((fdi) => FDI_MARADO.includes(fdi));
    return elsoKijelolt ?? FDI_MARADO[0];
  });

  const selectedKey = selectedTeeth?.join(',') ?? '';
  const markup = useMemo(
    () =>
      buildToothChartSvg(allapot, {
        sizing: 'responsive',
        showToothNumbers,
        interactive,
        szerep: listbox ? 'option' : 'button',
        focusedTooth: interactive ? aktivFog : undefined,
        selectedTeeth: listbox ? selectedTeeth : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedTeeth a selectedKey-jével helyettesítve (stabil string, a hívó gyakran friss tömb-referenciát ad ugyanahhoz a tartalomhoz)
    [allapot, showToothNumbers, interactive, listbox, aktivFog, selectedKey],
  );

  if (!interactive) {
    return (
      <div
        role="img"
        aria-label={CHART_ARIA_LABEL}
        style={{ cursor: 'default' }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    );
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    // React szintetikus esemény, nincs document.querySelector/useRef-es
    // utólagos DOM-túrás -- a kattintott elemtől a legközelebbi fog-
    // csoportig megyünk fel a data-tooth attribútum alapján.
    const toothEl = (e.target as Element).closest('[data-tooth]');
    const tooth = toothEl?.getAttribute('data-tooth');
    if (!tooth) return;
    setAktivFog(tooth);
    onToothClick?.(tooth);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = FDI_MARADO.indexOf(aktivFog);
    const row = idx < JAW_LEN ? 0 : 1;
    const col = idx % JAW_LEN;
    let nextIdx = idx;
    switch (e.key) {
      case 'ArrowRight':
        nextIdx = col < JAW_LEN - 1 ? idx + 1 : idx; // állcsonton belül, a szélén nincs körbe --
        break; // 18/28 (ill. 48/38) nem szomszédos fog, a körbeugrás átvágná az arcot
      case 'ArrowLeft':
        nextIdx = col > 0 ? idx - 1 : idx;
        break;
      case 'ArrowDown':
        nextIdx = row === 0 ? idx + JAW_LEN : idx; // ugyanaz az oszlop az alsó állcsonton -- anatómiailag szemközti fog
        break;
      case 'ArrowUp':
        nextIdx = row === 1 ? idx - JAW_LEN : idx;
        break;
      case 'Home':
        nextIdx = row * JAW_LEN;
        break;
      case 'End':
        nextIdx = row * JAW_LEN + JAW_LEN - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onToothClick?.(aktivFog);
        return;
      default:
        return;
    }
    e.preventDefault();
    if (nextIdx !== idx) setAktivFog(FDI_MARADO[nextIdx]);
  }

  return (
    <div
      role={listbox ? 'listbox' : 'toolbar'}
      aria-multiselectable={listbox ? true : undefined}
      aria-label={
        listbox
          ? 'Fogak kijelölése a fogtérképen – nyílbillentyűkkel navigálható, Enterrel/szóközzel ki-/bekapcsol'
          : 'Fogtérkép – nyílbillentyűkkel navigálható, Enterrel/szóközzel aktiválható'
      }
      aria-activedescendant={`tooth-${aktivFog}`}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer' }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
