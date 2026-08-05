// Ekezetfuggetlen keresesehez -- portolva ui/tokens.js:70-75-bol.
// "gyoker" -> megtalalja: "Gyokerkezeles"
//
// NFD-normalizalas szetszedi az ekezetes betuket alapbetu + kombinalo
// ekezetjel (U+0300-U+036F) parra, amit utana levagunk.

const COMBINING_MARKS = /[̀-ͯ]/g;

export function norm(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '');
}
