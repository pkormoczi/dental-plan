// Új ártétel-/kategória-id generálása -- D17: soha nem hasznosítunk újra egy
// id-t, ezért mindig a meglévő legnagyobb "tNNN"/"kNN" utáni szám következik,
// nem a lista hossza (ami törlés/inaktiválás után visszacsúszhatna).

export function nextTetelId(tetelek: { id: string }[]): string {
  let max = 0;
  for (const item of tetelek) {
    const m = /^t(\d+)$/.exec(item.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `t${String(max + 1).padStart(3, '0')}`;
}

/** A `nextTetelId` kategória-párja (docs/08-backlog.md 8. tétel, 9. döntés). */
export function nextKategoriaId(kategoriak: { id: string }[]): string {
  let max = 0;
  for (const item of kategoriak) {
    const m = /^k(\d+)$/.exec(item.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `k${String(max + 1).padStart(2, '0')}`;
}
