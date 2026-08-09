// Páciens adatlap -- docs/03-funkcionalis-spec.md "2. Páciens adatlap".
//
// Csak a név kötelező (ebből képződik a mappanév). A többi hiánya
// véglegesítéskor figyelmeztetést ad, de nem blokkol -- itt sincs
// kényszerített kitöltés, csak a "Tovább" gomb jelzi, ha a név üres.
//
// D21: itt dől el a terv nyelve és pénzneme -- itt derül ki a német páciens
// ténye. Mindkettő az első mentés után fagy (D4), lásd a `locked` ágat.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Flex,
  Grid,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import ChipGroup from '../components/ChipGroup';
import { sablonVerzioFor } from '../domain/blankPlan';
import { lefedettseg } from '../domain/coverage';
import { nevKoveti, nyelvvaltasHatasa, resolveNev } from '../domain/nev';
import type { Nyelv, Penznem } from '../domain/types';
import { t } from '../design/tokens';
import { useAppState } from '../state/AppState';

type PendingChange = { kind: 'nyelv'; value: Nyelv } | { kind: 'penznem'; value: Penznem };

export default function PatientPage() {
  const { plan, setPlan, settings, priceList } = useAppState();
  const navigate = useNavigate();
  const paciens = plan.paciens;
  const [pending, setPending] = useState<PendingChange | null>(null);

  function patch(fields: Partial<typeof paciens>) {
    setPlan((prev) => ({ ...prev, paciens: { ...prev.paciens, ...fields } }));
  }

  const nameMissing = !paciens.nev.trim();

  // A kártya csak akkor látszik, ha a német engedélyezve van -- vagy ha a
  // piszkozat már németül indult, hogy egy időközben kikapcsolt kapcsoló
  // ne tegye szerkeszthetetlenül némává egy folyamatban lévő német tervet.
  const showLangCard = settings.nemetEngedelyezve || plan.nyelv === 'de';
  // A mentett terv nyelve/pénzneme nem módosítható (D4) -- a `tervId` a jó
  // diszkriminátor, nem a `statusz`: egy VEGLEGES tervet újra meg lehet
  // nyitni (Korábbi tervek), hogy egy újabb verzió készüljön belőle, a
  // tervId ilyenkor is kitöltött marad.
  const locked = plan.tervId !== '';
  const cov = lefedettseg(priceList, plan.penznem);
  const sorokSzama = plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
  // A nyelváltás-megerősítő dialógus élő számlálásához -- lásd lent.
  const nyelvvaltasHatas = nyelvvaltasHatasa(plan, priceList);

  function applyNyelv(nyelv: Nyelv) {
    setPlan((prev) => {
      const next = structuredClone(prev);
      // A RÉGI nyelvvel hasonlítjuk össze -- csak azok a sorok frissülnek
      // az új nyelvre, amik még az árlistai automatikus nevet viselték; egy
      // kézzel pontosított (backlog-3) név nem íródik felül -- lásd
      // docs/archive/backlog/backlog-3b-nyelvvaltas-nevmegorzes-terv.md 6. döntés.
      const regiNyelv = prev.nyelv;
      next.nyelv = nyelv;
      next.sablonVerzio = sablonVerzioFor(nyelv);
      for (const f of next.fazisok) {
        for (const s of f.sorok) {
          const tetel = priceList.tetelek.find((x) => x.id === s.tetelId);
          if (tetel && nevKoveti(s, tetel, regiNyelv)) {
            s.nevSnapshot = resolveNev(tetel.nev, nyelv).szoveg;
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
      // A meglévő sorok ára a JELENLEGI pénznem alapegységében van rögzítve
      // (HUF forint, EUR cent, lásd domain/money.ts) -- pénznemváltás nem
      // átváltás, hanem a számok újraértelmezése lenne rossz mértékegységben.
      // Ezért a sorok törlődnek, nem "áthidalódnak".
      if (sorokSzama > 0) {
        for (const f of next.fazisok) f.sorok = [];
      }
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
    if (sorokSzama > 0) {
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

  return (
    <Box style={{ maxWidth: 560, margin: '0 auto' }}>
      <Heading size="5" mb="4" style={{ color: t.brand }}>
        Páciens adatlap
      </Heading>

      {showLangCard && (
        <Card size="2" mb="4">
          <Text as="p" size="2" weight="bold" mb="3" style={{ color: t.brand }}>
            Az ajánlat nyelve és pénzneme
          </Text>

          {locked ? (
            <Box>
              <Text size="2">
                {plan.nyelv === 'de' ? 'Deutsch' : 'Magyar'} · {plan.penznem}
              </Text>
              <Text as="div" size="1" color="gray" mt="1">
                A mentett terv nyelve és pénzneme nem módosítható (D4) — új tervet kell
                indítani.
              </Text>
            </Box>
          ) : (
            <>
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

              {plan.nyelv === 'de' && cov.deNevvel < cov.aktivOsszes && (
                <Callout.Root color="amber" size="1" mt="2">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {cov.aktivOsszes - cov.deNevvel} / {cov.aktivOsszes} aktív tételnek nincs
                    német neve — ezek <Text weight="bold">magyarul</Text> kerülnek a
                    nyomtatványra. Az Árlistán pótolhatók.
                  </Callout.Text>
                </Callout.Root>
              )}
              {cov.arazott === 0 && (
                <Callout.Root color="amber" size="1" mt="2">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Ebben a pénznemben ({plan.penznem}) egyetlen tétel sincs beárazva — a
                    szerkesztő keresője nem fog találatot adni. Válts pénznemet, vagy töltsd ki
                    az árakat az Árlistán.
                  </Callout.Text>
                </Callout.Root>
              )}
            </>
          )}
        </Card>
      )}

      <Card size="2" mb="4">
        <Field label="Név *">
          <TextField.Root
            autoFocus
            value={paciens.nev}
            onChange={(e) => patch({ nev: e.target.value })}
            placeholder="Kovács János"
          />
        </Field>
        {nameMissing && (
          <Text as="div" size="1" mt="-2" mb="3" style={{ color: t.warn }}>
            A név nélkül a mappanév sem képezhető, de tovább léphetsz.
          </Text>
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
      </Card>

      <Flex justify="end" mt="4">
        <Button onClick={() => navigate('/terv')}>Tovább a terv szerkesztőhöz</Button>
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
              : `A tervben már ${sorokSzama} tétel szerepel, a jelenlegi pénznemben ` +
                `(${plan.penznem}) rögzített árral. Pénznemváltáskor ezek a sorok törlődnek, ` +
                'hogy ne maradjon rossz pénznemben rögzített ár a tervben. Folytatod?'}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={confirmPending}>
                Folytatás
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <Text as="div" size="1" color="gray" mb="1">
        {label}
      </Text>
      {children}
    </label>
  );
}

/**
 * Ugyanaz a vizuális minta, mint a `Field`, de `<div>`-del `<label>` helyett --
 * egy `<label>` a HTML szerint egyetlen "labelable" elemet (pl. `<input>`,
 * `<button>`) jelölhet implicit módon; egy ChipGroup KÉT gombja egy közös
 * `<label>`-ben kétértelmű accessible name-et adott mindkét gombnak.
 */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box mb="3">
      <Text as="div" size="1" color="gray" mb="1">
        {label}
      </Text>
      {children}
    </Box>
  );
}
