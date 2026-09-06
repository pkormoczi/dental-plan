// Pufferelt mezők -- kiemelve a PriceListAdminPage.tsx-ből. Mindkettő
// mindenegyütésre ment (a mai viselkedés változatlan), de a `NumberField`
// mintájára egy lokális `draft`-ból jelenít meg, nem közvetlenül a `value`
// propból, amíg fókuszban van.
//
// Az updater-szerződés óta a `priceList` context-érték a mentés ELŐTT, szinkron frissül
// (`AppState.tsx` `savePriceList` -- optimista `apply*`), tehát a korábbi
// async kör-forduló, ami ezt a mezőt visszaugratta volna a régi értékre,
// megszűnt. A `draft` mégis marad: bármely MÁSIK mező/tétel commitja új
// `priceList`/`item` objektum-identitást ad ennek a mezőnek is gépelés
// közben, és fókuszban a `draft` ettől függetlenül mindig a ténylegesen
// begépelt szöveget mutatja, nem a props újraszámolt (tartalmilag
// ugyanolyan, de más referenciájú) értékét.

import { useEffect, useState } from 'react';
import { TextArea, TextField } from '@radix-ui/themes';

export function BufferedTextField({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  return (
    <TextField.Root
      id={id}
      value={draft}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

/** `BufferedTextField` többsoros párja -- a tétel-leírás mezőkhöz. Ugyanaz a draft/focused minta, lásd fent. */
export function BufferedTextArea({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  return (
    <TextArea
      id={id}
      value={draft}
      placeholder={placeholder}
      rows={3}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}
