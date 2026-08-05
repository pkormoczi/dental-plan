// Új ártétel-id generálása -- D17: soha nem hasznosítunk újra egy id-t, ezért
// mindig a meglévő legnagyobb "tNNN" utáni szám következik, nem a lista
// hossza (ami törlés/inaktiválás után visszacsúszhatna).

export function nextTetelId(tetelek: { id: string }[]): string {
  let max = 0;
  for (const item of tetelek) {
    const m = /^t(\d+)$/.exec(item.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `t${String(max + 1).padStart(3, '0')}`;
}
