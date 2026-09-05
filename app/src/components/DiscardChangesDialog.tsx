// Megosztott "elvetnéd a módosításokat?" megerősítő dialógus -- D38
// (docs/07-felulet-rendszer.md § Komponensek). Korábban öt helyen
// (PaciensekPage, PatientPlanChains, NewPlanPage, Home, PlanEditorPage)
// külön-külön bemásolt `AlertDialog` minta -- ez a hook+komponens pár a
// mentetlen FORM-draft (nem a piszkozat-terv identitás, lásd D37) elhagyása
// elleni védelmet fedi le. A "piszkozat felülírása" (aktív terv-draft) guardok
// (Home/NewPlanPage/PatientPlanChains) SZÁNDÉKOSAN nem lettek erre átállítva
// -- más domaint védenek (D37), ez a komponens csak stílusmintaként áll
// rendelkezésre nekik.

import { useState, type RefObject } from 'react';
import { AlertDialog, Button, Flex } from '@radix-ui/themes';

/**
 * `request(apply)` dirty állapotban megnyitja a dialógust és eltárolja
 * `apply`-t, egyébként azonnal lefuttatja -- a hívónak nem kell külön
 * elágaznia dirty/nem-dirty között.
 */
export function useDiscardGuard(dirty: boolean) {
  const [pendingApply, setPendingApply] = useState<(() => void) | null>(null);

  function request(apply: () => void) {
    if (dirty) {
      setPendingApply(() => apply);
    } else {
      apply();
    }
  }

  function confirm() {
    pendingApply?.();
    setPendingApply(null);
  }

  function cancel() {
    setPendingApply(null);
  }

  return { pending: pendingApply !== null, request, confirm, cancel };
}

export default function DiscardChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  visszaFokuszRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  /**
   * Csak egy MÁR NYITOTT, fókusz-csapdázott felület (pl. `Dialog`) alá
   * ágyazott hívónak kell: Radix-forráskódban igazolt bug, hogy egy
   * kontrollált (trigger nélküli) `AlertDialog` bezárásakor a beépített
   * visszafókuszálás `triggerRef.current` null-ra fut, és a fókusz a
   * `<body>`-ra esne a mögötte lévő felület alól.
   */
  visszaFokuszRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content
        maxWidth="440px"
        onCloseAutoFocus={
          visszaFokuszRef
            ? (e) => {
                e.preventDefault();
                requestAnimationFrame(() => visszaFokuszRef.current?.focus());
              }
            : undefined
        }
      >
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description size="2">{description}</AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Mégse
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button color="red" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
