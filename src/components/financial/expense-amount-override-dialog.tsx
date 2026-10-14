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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setExpenseAmountOverride, clearExpenseAmountOverride } from "@/server/actions/expenses";
import { useActionToast } from "@/hooks/use-action-toast";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

// A small pencil button that opens a dialog for directly setting this one
// month's charged amount for an expense — including a RECURRING one, where
// editing the expense itself would change every month, not just this one.
// See setExpenseAmountOverride. The note is required so a number that no
// longer matches the expense's normal amount stays explained.
export function ExpenseAmountOverrideButton({
  expenseId,
  referenceMonth,
  amount,
  amountOverride,
  amountOverrideNote,
}: {
  expenseId: string;
  referenceMonth: Date;
  amount: number;
  amountOverride: number | null;
  amountOverrideNote: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(setExpenseAmountOverride, undefined);
  const [isClearing, setIsClearing] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label="Ajustar valor deste mês"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar valor do gasto</DialogTitle>
          <DialogDescription>
            Define o valor cobrado só deste mês, sem alterar o gasto cadastrado nem outros meses —
            mesmo para um gasto recorrente.
            {amountOverride != null && amountOverrideNote && (
              <span className="mt-2 block rounded-md bg-muted p-2 text-xs">
                Ajuste atual: {amountOverrideNote}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="expenseId" value={expenseId} />
          <input type="hidden" name="referenceMonth" value={toIsoDate(referenceMonth)} />

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={amountOverride ?? amount}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Motivo do ajuste (opcional)</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="ex.: cobrança parcial, reembolso neste mês..."
              defaultValue={amountOverride != null ? (amountOverrideNote ?? "") : ""}
            />
          </div>

          <DialogFooter>
            {amountOverride != null && (
              <Button
                type="button"
                variant="outline"
                disabled={isClearing}
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await clearExpenseAmountOverride(expenseId, referenceMonth);
                    setOpen(false);
                  } finally {
                    setIsClearing(false);
                  }
                }}
              >
                {isClearing ? <Loader2 className="animate-spin" /> : <Undo2 />}
                Reverter para o valor normal
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
