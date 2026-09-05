// Új ártétel-/kategória-id generálása -- egy id soha nem hasznosul újra (a
// régi tervek évek múlva is értelmezhetők maradnak), ezért mindig a meglévő
// legnagyobb "tNNN"/"kNN" utáni szám következik,
// nem a lista hossza (ami törlés/inaktiválás után visszacsúszhatna).

export function nextTetelId(tetelek: { id: string }[]): string {
  let max = 0;
  for (const item of tetelek) {
    const m = /^t(\d+)$/.exec(item.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `t${String(max + 1).padStart(3, '0')}`;
}

/** A `nextTetelId` kategória-párja, ugyanazzal az elvvel (id sosem hasznosul újra). */
export function nextKategoriaId(kategoriak: { id: string }[]): string {
  let max = 0;
  for (const item of kategoriak) {
    const m = /^k(\d+)$/.exec(item.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `k${String(max + 1).padStart(2, '0')}`;
}
