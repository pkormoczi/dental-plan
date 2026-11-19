// A megszűnt DEMO oldal fülcímei (`/demo/<fül>`) könyvjelzőben és a telepítési útmutató régi
// példányaiban élhetnek: mindegyik az új helyére visz, egyik sem üres oldalra. Telepítve a két
// demó-only Beállítások-fül nincs, ott a `SettingsPage` a saját alapfülére esik.

import { Navigate, useParams } from 'react-router-dom';

// Map, nem objektum-literál: a `/demo/constructor` se találjon örökölt kulcsot.
const UJ_HELY = new Map<string, string>([
  ['funkciok', '/sugo'],
  ['valtozasnaplo', '/sugo/valtozasnaplo'],
  ['tervek', '/tervek'],
  ['filerendszer', '/beallitasok?tab=filerendszer'],
  ['adatkezeles', '/beallitasok?tab=adatkezeles'],
]);

export default function RegiDemoCim() {
  const { tab } = useParams<{ tab?: string }>();
  return <Navigate to={UJ_HELY.get(tab ?? '') ?? '/sugo'} replace />;
}
