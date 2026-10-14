"use client";

import { useActionState, useState } from "react";
import { Pencil, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setPaymentOverride, clearPaymentOverride } from "@/server/actions/payments";
import { useActionToast } from "@/hooks/use-action-toast";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

// A small pencil button that opens a dialog for directly setting this one
// month's valor/vencimento — a one-time exception (see setPaymentOverride)
// that never touches the cadastro and never affects any other month. The
// note is required so a number that no longer matches the cadastro stays
// explained. Rendered twice (once by the Valor cell, once by Vencimento)
// so both are reachable inline, but both open the exact same dialog.
export function PaymentOverrideButton({
  studentId,
  payerName,
  referenceMonth,
  amount,
  dueDate,
  manualOverride,
  manualOverrideNote,
  label,
}: {
  studentId: string;
  payerName: string | null;
  referenceMonth: Date;
  amount: number;
  dueDate: Date;
  manualOverride: boolean;
  manualOverrideNote: string | null;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(setPaymentOverride, undefined);
  const [isClearing, setIsClearing] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar cobrança</DialogTitle>
          <DialogDescription>
            Define o valor e o vencimento só deste mês, sem alterar o cadastro nem outros meses.
            {manualOverride && manualOverrideNote && (
              <span className="mt-2 block rounded-md bg-muted p-2 text-xs">
                Ajuste atual: {manualOverrideNote}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="payerName" value={payerName ?? ""} />
          <input type="hidden" name="referenceMonth" value={toIsoDate(referenceMonth)} />

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={amount} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Vencimento</Label>
            <DateInput id="dueDate" name="dueDate" defaultValue={toIsoDate(dueDate)} required />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="note">Motivo do ajuste</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="ex.: desconto combinado só este mês, vencimento adiado por feriado..."
              defaultValue={manualOverride ? (manualOverrideNote ?? "") : ""}
              required
            />
          </div>

          <DialogFooter className="sm:col-span-2">
            {manualOverride && (
              <Button
                type="button"
                variant="outline"
                disabled={isClearing}
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await clearPaymentOverride(studentId, payerName, referenceMonth);
                    setOpen(false);
                  } finally {
                    setIsClearing(false);
                  }
                }}
              >
                {isClearing ? <Loader2 className="animate-spin" /> : <Undo2 />}
                Reverter para o cadastro
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Salvar ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
