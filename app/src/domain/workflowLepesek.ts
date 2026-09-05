// A 3 workflow-route emberi felirata -- eredetileg a
// `TervWorkflowShell.tsx` privát `LEPESEK` tömbje volt (a stepperhez), a
// 46. tétel (terv-lánc fa aktív-draft blokkja) emelte ide, hogy a
// `piszkozatLastRoute` felirata ne másolódjon egy második helyre.

import type { WorkflowRoute } from '../storage/DraftStorage';

export const WORKFLOW_LEPESEK: ReadonlyArray<{ to: WorkflowRoute; label: string }> = [
  { to: '/paciens', label: 'Terv adatai' },
  { to: '/terv', label: 'Kezelések' },
  { to: '/elonezet', label: 'Előnézet és véglegesítés' },
];

/** A `route` emberi felirata, vagy `null`, ha a route ismeretlen/hiányzik. */
export function workflowLepesFelirat(route: WorkflowRoute | null): string | null {
  return WORKFLOW_LEPESEK.find((lepes) => lepes.to === route)?.label ?? null;
}
