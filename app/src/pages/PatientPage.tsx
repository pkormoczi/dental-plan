// Terv adatai -- docs/03-funkcionalis-spec.md "2. Terv adatai" (D61: hat,
// vizuálisan elkülönített szekció -- Terv címe, Páciens adatai, Dokumentum
// nyelve, Pénznem, Kezelőorvos, Dátumok).
//
// Csak a név kötelező (ebből képződik a mappanév). A többi hiánya
// véglegesítéskor figyelmeztetést ad, de nem blokkol -- itt sincs
// kényszerített kitöltés, csak a "Tovább" gomb jelzi, ha a név üres.
//
// D21: itt dől el a terv nyelve és pénzneme -- itt derül ki a német páciens
// ténye. A teljes piszkozat-életciklus alatt szabadon módosítható (52.
// tétel): a technikai autosave/mentés nem fagyasztja ezeket az értékeket,
// csak a véglegesítés hozza létre az immutable pillanatképet -- egy már
// lezárt verzió eleve nem ezen a lapon jelenik meg (lásd "Terv részletei").
// A Kezelőorvos szekció (D67) ugyanígy szabadon szerkeszthető, egy mentett
// láncon is -- itt sosem volt zárolás, ami alól ki kellene venni.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Checkbox,
  Flex,
  Grid,
  Heading,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import ChipGroup from '../components/ChipGroup';
import { Field, FieldGroup, ReadOnlyField } from '../components/Field';
import { useLepesGuard } from '../components/LepesGuardContext';
import { usePaciensKotes } from '../components/PaciensKotesContext';
import Section from '../components/Section';
import { lefedettseg } from '../domain/coverage';
import { addDaysIso, formatLongDate } from '../domain/date';
import { leirasKoveti, nevKoveti, nyelvvaltasHatasa, resolveNev } from '../domain/nev';
import { aktivOrvosok } from '../domain/orvosok';
import {
  penznemvaltasHatasa,
  sorPenznemValtassal,
  tervOsszegekPenznemValtassal,
  type PenznemvaltasHatas,
} from '../domain/penznemValtas';
import type { Nyelv, Penznem } from '../domain/types';
import { t } from '../design/tokens';
import TervCimField from './patientPage/TervCimField';
import TorzsadatSyncCard from './patientPage/TorzsadatSyncCard';
import { useAppState } from '../state/AppState';

type PendingChange = { kind: 'nyelv'; value: Nyelv } | { kind: 'penznem'; value: Penznem };

const TERV_SZINTU_NEV: Record<'vegosszeg' | 'eloleg', string> = {
  vegosszeg: 'az egyedi végösszeg',
  eloleg: 'az előleg',
};

function felsorol(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} és ${items[items.length - 1]}`;
}

/**
 * A pénznemváltás-dialógus terv-szintű mondata -- a `penznemvaltasHatas.
 * tervSzintu` (`domain/penznemValtas.ts`) emberi megnevezése; a domain-modul
 * maga nem tart UI-prózát, a nyelváltás-dialógus mintájára.
 */
function tervSzintuMondat(tervSzintu: PenznemvaltasHatas['tervSzintu']): string | null {
  if (tervSzintu.length === 0) return null;
  const visszaall = tervSzintu.filter((h) => h.hatas === 'visszaall').map((h) => TERV_SZINTU_NEV[h.mezo]);
  const kikapcsol = tervSzintu.filter((h) => h.hatas === 'kikapcsol').map((h) => TERV_SZINTU_NEV[h.mezo]);
  const reszek: string[] = [];
  if (visszaall.length > 0) {
    reszek.push(`${felsorol(visszaall)} a korábban ebben a pénznemben megadott értékét kapja vissza`);
  }
  if (kikapcsol.length > 0) {
    reszek.push(
      `${felsorol(kikapcsol)} kikapcsol — ebben a pénznemben még nincs mentett érték, kézzel állítható be újra`,
    );
  }
  const mondat = reszek.join('; ');
  return `${mondat.charAt(0).toUpperCase()}${mondat.slice(1)}.`;
}

/**
 * A pénznemváltás-dialógus teljes szövege -- a sorokról szóló mondat CSAK
 * `sorokSzama > 0`-nál jelenik meg (a régi, sor nélküli terveken egy "0
 * tétel szerepel" mondat értelmetlen lenne), a terv-szintű mondat pedig
 * csak akkor, ha van érintett mező -- lásd `tervSzintuMondat()`.
 */
function penznemDialogSzoveg(hatas: PenznemvaltasHatas, sorokSzama: number): string {
  const sorokMondat =
    sorokSzama === 0
      ? null
      : hatas.visszaall > 0 || hatas.arlistabol > 0
        ? `A tervben már ${sorokSzama} tétel szerepel. Pénznemváltáskor ` +
          `${hatas.visszaall} sor a korábban ebben a pénznemben megadott ` +
          `árát kapja vissza, ${hatas.arlistabol} sor ára az árlistából ` +
          `frissül` +
          (hatas.arNelkul > 0 ? `, ${hatas.arNelkul} sor ár nélkül marad (kézzel kell kitölteni)` : '') +
          '. A sorok nem törlődnek.'
        : `A tervben már ${sorokSzama} tétel szerepel, egyik sem beárazott az új ` +
          'pénznemben — ezek a sorok ár nélkül maradnak, kézzel kell kitölteni. A ' +
          'sorok nem törlődnek.';

  const tervMondat = tervSzintuMondat(hatas.tervSzintu);
  return `${[sorokMondat, tervMondat].filter(Boolean).join(' ')} Folytatod?`;
}

export default function PatientPage() {
  const { plan, setPlan, settings, priceList } = useAppState();
  const navigate = useNavigate();
  const { kerLepesValtas } = useLepesGuard();
  const { patientDir: kotottPatientDir, kotott, utkozok } = usePaciensKotes();
  const paciens = plan.paciens;
  const [pending, setPending] = useState<PendingChange | null>(null);
  const aktivOrvosNevek = aktivOrvosok(settings);
  // Egy időközben deaktivált/törölt orvosra hivatkozó, még mentetlen sor --
  // a draft szabadon szerkeszthető marad ilyen állapotban is (D63/D537), a
  // véglegesítés-őr blokkolja, ha a doki nem választ aktív orvost.
  const orvosArva = !!plan.orvos && !aktivOrvosNevek.includes(plan.orvos);

  function patch(fields: Partial<typeof paciens>) {
    setPlan((prev) => ({ ...prev, paciens: { ...prev.paciens, ...fields } }));
  }

  const nameMissing = !paciens.nev.trim();

  const cov = lefedettseg(priceList, plan.penznem);
  const sorokSzama = plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
  // A nyelváltás-megerősítő dialógus élő számlálásához -- lásd lent.
  const nyelvvaltasHatas = nyelvvaltasHatasa(plan, priceList);
  // A pénznemváltás-megerősítő dialógus élő számlálásához -- csak a pending
  // CÉL-pénznemre értelmes, ezért `pending?.kind === 'penznem'` mellett kell.
  const penznemvaltasHatas =
    pending?.kind === 'penznem' ? penznemvaltasHatasa(plan, priceList, pending.value) : null;

  function applyNyelv(nyelv: Nyelv) {
    setPlan((prev) => {
      const next = structuredClone(prev);
      // A RÉGI nyelvvel hasonlítjuk össze -- csak azok a sorok frissülnek
      // az új nyelvre, amik még az árlistai automatikus nevet viselték; egy
      // kézzel pontosított név nem íródik felül -- lásd D24
      // (docs/01-attekintes-es-dontesek.md).
      const regiNyelv = prev.nyelv;
      next.nyelv = nyelv;
      for (const f of next.fazisok) {
        for (const s of f.sorok) {
          const tetel = priceList.tetelek.find((x) => x.id === s.tetelId);
          if (tetel && nevKoveti(s, tetel, regiNyelv)) {
            s.nevSnapshot = resolveNev(tetel.nev, nyelv).szoveg;
          }
          // A leírásnak nincs HU-visszaesése (D27, docs/01) -- a hiányzó
          // fordítás itt üres stringgé normalizálódik, lásd leirasKoveti().
          if (tetel && leirasKoveti(s, tetel, regiNyelv)) {
            s.leirasSnapshot = (nyelv === 'hu' ? tetel.leiras?.hu : tetel.leiras?.de) ?? '';
          }
        }
      }
      return next;
    });
  }

  function applyPenznem(penznem: Penznem) {
    setPlan((prev) => {
      const next = structuredClone(prev);
      next.penznem = penznem;
      // A kilépő pénznem árpárja soronként a `masikPenznemAr` stash-be
      // kerül, nem törlődik -- lásd domain/penznemValtas.ts
      // `sorPenznemValtassal()`.
      const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
      for (const f of next.fazisok) {
        f.sorok = f.sorok.map((s) => sorPenznemValtassal(s, penznem, tetelById.get(s.tetelId)));
      }
      // A terv-szintű egyedi végösszeg/előleg is a `Sor.masikPenznemAr`
      // mintáját követi -- lásd `tervOsszegekPenznemValtassal()`.
      const tervOsszegek = tervOsszegekPenznemValtassal(prev);
      next.kedvezmenyOsszeg = tervOsszegek.kedvezmenyOsszeg;
      next.elolegOsszeg = tervOsszegek.elolegOsszeg;
      next.masikPenznemOsszegek = tervOsszegek.masikPenznemOsszegek;
      return next;
    });
  }

  function changeNyelv(nyelv: Nyelv) {
    if (nyelv === plan.nyelv) return;
    if (sorokSzama > 0) {
      setPending({ kind: 'nyelv', value: nyelv });
      return;
    }
    applyNyelv(nyelv);
  }

  function changePenznem(penznem: Penznem) {
    if (penznem === plan.penznem) return;
    // A sorok mellett a terv-szintű egyedi végösszeg/előleg is érintett
    // lehet -- egy sor nélküli, de beállított tervnél is meg kell
    // erősítést kérni, ne csak `sorokSzama > 0`-nál.
    const erintett = sorokSzama > 0 || penznemvaltasHatasa(plan, priceList, penznem).tervSzintu.length > 0;
    if (erintett) {
      setPending({ kind: 'penznem', value: penznem });
      return;
    }
    applyPenznem(penznem);
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.kind === 'nyelv') applyNyelv(pending.value);
    else applyPenznem(pending.value);
    setPending(null);
  }

  function patchErvenyesIg(value: string) {
    setPlan((prev) => ({ ...prev, ervenyesIg: value }));
  }

  // Az alapérték a `plan.keltezes`-ből számol, NEM `todayIso()`-ból: a
  // visszaállítás a nyomtatványon megjelenő kiadás dátumához mért ablakot
  // kell adja, ne a mai naphoz mérten (D22 a `keltezes`-t úgyis mai napra
  // bélyegzi betöltéskor -- a kettő csak emiatt esik egybe egy friss
  // piszkozaton, nem szabad ezt egy közös helperbe összemosni).
  const alapErvenyesIg = addDaysIso(plan.keltezes, settings.ervenyessegNap);
  const ervenyesIgEltrErAlaptol = plan.ervenyesIg !== alapErvenyesIg;
  const ervenyesIgHibas = plan.ervenyesIg < plan.keltezes;

  return (
    <Box style={{ maxWidth: 560, margin: '0 auto' }}>
      <Heading size="5" mb="4" style={{ color: t.brand }}>
        Terv adatai
      </Heading>

      <Section title="Terv címe">
        <TervCimField />
      </Section>

      <Section title="Páciens adatai">
        <Box mb="3">
          <Field label="Név *">
            <TextField.Root
              autoFocus
              value={paciens.nev}
              onChange={(e) => patch({ nev: e.target.value })}
              placeholder="Kovács János"
            />
          </Field>
        </Box>
        {nameMissing && (
          <Text as="div" size="1" mt="-2" mb="3" style={{ color: t.warn }}>
            A név nélkül a mappanév sem képezhető, de tovább léphetsz.
          </Text>
        )}

        {/* 94. tétel: a piszkozathoz kötött páciensmappa semleges jelzése --
            FÜGGETLENÜL attól, ütközik-e a Név mező tartalma valakivel. A
            terv mindig ebbe a mappába, ennek a páciensnek az azonosító
            adatai (telefon/e-mail/lakcím/TAJ) mellé mentődik, a Név mező
            tartalmától függetlenül. */}
        {kotott && (
          <Box mb="3">
            <ReadOnlyField
              label="A terv ehhez a páciensmappához kötve mentődik"
              value={`${kotott.nev} (${kotottPatientDir})`}
            />
          </Box>
        )}

        {kotott && utkozok.length > 0 && (
          <Callout.Root color="red" size="1" mb="3">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              A beírt név egy MÁSIK, létező páciensre ({utkozok.map((p) => p.nev).join(', ')}) illik
              pontosan — a terv ettől függetlenül a fenti kötött páciensmappába mentődik. A
              véglegesítés blokkolva van, amíg a név nem egyezik a kötött páciens nevével.
            </Callout.Text>
          </Callout.Root>
        )}

        <Grid columns="2" gap="3">
          <Field label="Született">
            <TextField.Root
              type="date"
              value={paciens.szuletesiIdo}
              onChange={(e) => patch({ szuletesiIdo: e.target.value })}
            />
          </Field>
          <Field label="TAJ">
            <TextField.Root
              value={paciens.taj}
              onChange={(e) => patch({ taj: e.target.value })}
              placeholder="123 456 789"
            />
          </Field>
        </Grid>

        <Box mt="3">
          <Field label="Lakcím">
            <TextField.Root
              value={paciens.lakcim}
              onChange={(e) => patch({ lakcim: e.target.value })}
              placeholder="1113 Budapest, Bartók Béla út 42. 2/5"
            />
          </Field>
        </Box>

        <Grid columns="2" gap="3" mt="3">
          <Field label="Telefon">
            <TextField.Root
              value={paciens.telefon}
              onChange={(e) => patch({ telefon: e.target.value })}
              placeholder="+36 30 123 4567"
            />
          </Field>
          <Field label="E-mail">
            <TextField.Root
              type="email"
              value={paciens.email}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="kovacs.janos@example.hu"
            />
          </Field>
        </Grid>

        <Text as="label" size="2" mt="3" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Checkbox
            checked={paciens.kiskoru}
            onCheckedChange={(checked) => patch({ kiskoru: checked === true })}
          />
          Kiskorú
        </Text>

        {paciens.kiskoru && (
          <Box mt="3">
            <Field label="Törvényes képviselő (név, elérhetőség)">
              <TextField.Root
                value={paciens.torvenyesKepviselo ?? ''}
                onChange={(e) => patch({ torvenyesKepviselo: e.target.value || null })}
                placeholder="Kovács Ildikó (édesanya) — +36 30 111 2222"
              />
            </Field>
          </Box>
        )}

        <TorzsadatSyncCard />
      </Section>

      <Section title="Dokumentum nyelve">
        <FieldGroup label="Nyelv (a nyomtatvány nyelve)">
          <ChipGroup
            value={plan.nyelv}
            options={[
              ['hu', 'Magyar'],
              ['de', 'Deutsch'],
            ]}
            onChange={changeNyelv}
          />
        </FieldGroup>

        {plan.nyelv === 'de' && cov.deNevvel < cov.aktivOsszes && (
          <Callout.Root color="amber" size="1" mt="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              {cov.aktivOsszes - cov.deNevvel} / {cov.aktivOsszes} aktív tételnek nincs német
              neve — ezek <Text weight="bold">magyarul</Text> kerülnek a nyomtatványra. Az
              Árlistán pótolhatók.
            </Callout.Text>
          </Callout.Root>
        )}
      </Section>

      <Section title="Pénznem">
        <FieldGroup label="Pénznem (ez dönti el, mely tételek ajánlhatók)">
          <ChipGroup
            value={plan.penznem}
            options={[
              ['HUF', 'HUF — forint'],
              ['EUR', 'EUR — euró'],
            ]}
            onChange={changePenznem}
          />
        </FieldGroup>

        {cov.arazott === 0 && (
          <Callout.Root color="amber" size="1" mt="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              Ebben a pénznemben ({plan.penznem}) egyetlen tétel sincs beárazva — a szerkesztő
              keresője nem fog találatot adni. Válts pénznemet, vagy töltsd ki az árakat az
              Árlistán.
            </Callout.Text>
          </Callout.Root>
        )}
      </Section>

      <Section title="Kezelőorvos">
        {/* A "Kezelőorvos" felirat itt a Section címe -- ez a mezőcímke
            SZÁNDÉKOSAN nem ismétli meg szó szerint (a PatientPage.test.tsx
            hat-szekció tesztje `getByText('Kezelőorvos')`-szal ellenőriz,
            ami egy azonos szövegű Field-címkével két találatot adna). */}
        <Field label="Kezelőorvos (aláírás-blokk)">
          <Select.Root
            value={plan.orvos || undefined}
            onValueChange={(v) => setPlan((prev) => ({ ...prev, orvos: v }))}
          >
            <Select.Trigger placeholder="Válassz kezelőorvost…" style={{ width: '100%', maxWidth: 320 }} />
            <Select.Content>
              {aktivOrvosNevek.map((nev) => (
                <Select.Item key={nev} value={nev}>
                  {nev}
                </Select.Item>
              ))}
              {orvosArva && (
                <>
                  <Select.Separator />
                  <Select.Item value={plan.orvos}>{plan.orvos}</Select.Item>
                </>
              )}
            </Select.Content>
          </Select.Root>
        </Field>
        {orvosArva && (
          <Callout.Root color="amber" size="1" mt="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              A kiválasztott orvos ({plan.orvos}) már nem aktív. A véglegesítés blokkolva lesz,
              amíg nem választasz aktív kezelőorvost.
            </Callout.Text>
          </Callout.Root>
        )}
        {!orvosArva && aktivOrvosNevek.length === 0 && (
          <Callout.Root color="amber" size="1" mt="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              Nincs aktív kezelőorvos a Beállításokban — a véglegesítés blokkolva lesz, amíg
              nem aktiválsz egyet.
            </Callout.Text>
          </Callout.Root>
        )}
      </Section>

      <Section title="Dátumok">
        <ReadOnlyField label="Kiadás dátuma" value={formatLongDate(plan.keltezes, 'hu')} />

        <Box mt="3">
          <Field label="Érvényes eddig">
            <TextField.Root
              type="date"
              value={plan.ervenyesIg}
              onChange={(e) => patchErvenyesIg(e.target.value)}
              onBlur={(e) => {
                if (!e.target.value) patchErvenyesIg(alapErvenyesIg);
              }}
            />
          </Field>
        </Box>

        {ervenyesIgEltrErAlaptol && (
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            mt="2"
            onClick={() => patchErvenyesIg(alapErvenyesIg)}
          >
            Vissza az alapértelmezettre ({settings.ervenyessegNap} nap)
          </Button>
        )}

        {ervenyesIgHibas && (
          <Callout.Root color="amber" size="1" mt="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>Az érvényesség vége a kiadás dátuma előttre esik.</Callout.Text>
          </Callout.Root>
        )}
      </Section>

      <Flex justify="end" mt="4">
        <Button onClick={() => kerLepesValtas(() => navigate('/terv'))}>
          Tovább a terv szerkesztőhöz
        </Button>
      </Flex>

      <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>
            {pending?.kind === 'nyelv' ? 'Nyelv váltása' : 'Pénznem váltása'}
          </AlertDialog.Title>
          <AlertDialog.Description size="2">
            {pending?.kind === 'nyelv'
              ? nyelvvaltasHatas.valtozatlan > 0
                ? `A nyelv váltásakor ${nyelvvaltasHatas.frissul} sor neve frissül az új ` +
                  `nyelvre, ${nyelvvaltasHatas.valtozatlan} kézzel átírt név változatlan marad ` +
                  '(ezeket a szerkesztőben egy „átírt” jelvény jelzi). Folytatod?'
                : `A tervben már ${sorokSzama} tétel szerepel. A nyelv váltásakor a tételnevek ` +
                  'frissülnek az új nyelvre. Folytatod?'
              : penznemvaltasHatas && penznemDialogSzoveg(penznemvaltasHatas, sorokSzama)}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color={pending?.kind === 'nyelv' ? 'red' : undefined} onClick={confirmPending}>
                Folytatás
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
