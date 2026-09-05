// Mezőszintű validáció a páciens-törzsadat szerkesztőjéhez --
// ellentétben a `validate.ts`-szel (JSON betöltési határ, throw alapú
// alakellenőrzés), ez a doki gépelését ellenőrzi, és hibaszöveget ad
// vissza, nem dob. Mindkét mező opcionális -- üres bemenetnél nincs hiba.

// Nem RFC 5322-parser: a cél az elgépelés kiszűrése (pl. "kovacs.janos@"),
// nem a kézbesíthetőség garantálása.
const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailHiba(email: string): string | null {
  if (!email.trim()) return null;
  return EMAIL_MINTA.test(email.trim()) ? null : 'Érvénytelen e-mail cím.';
}

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** `ma` kötelező (nem `todayIso()` alapérték) -- determinisztikus teszteléshez, a `formatRelativIdo()` mintáján. */
export function szuletesiIdoHiba(szuletesiIdo: string, ma: string): string | null {
  if (!szuletesiIdo.trim()) return null;
  if (!ISO_DATUM.test(szuletesiIdo)) return 'Adj meg egy teljes dátumot.';
  // ISO (YYYY-MM-DD) dátumok lexikografikusan összehasonlíthatók, nincs szükség `Date`-re.
  return szuletesiIdo > ma ? 'A születési dátum nem lehet jövőbeli.' : null;
}
