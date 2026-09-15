"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addTeacherPayout, deleteTeacherPayout } from "@/server/actions/payouts";
import { formatCurrency, formatDate } from "@/lib/labels";

type Entry = { id: string; amount: number; paidAt: Date };

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// The "Realizado" cell on the Pagamento de professores list — every
// payment made to this teacher this month shows as its own chip (amount
// + date, removable), with a "+" to log another and a fixed Total that
// sums them all. Amount and date are both typed by hand — the amount
// defaults to whatever's still owed against Previsto and the date to
// today, but either can be edited (e.g. a teacher paid in installments,
// or a payment logged a few days after it actually happened).
export function TeacherPayoutCell({
  teacherId,
  year,
  month,
  previsto,
  entries,
}: {
  teacherId: string;
  year: number;
  month: number;
  previsto: number;
  entries: Entry[];
}) {
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const remaining = Math.max(0, previsto - total);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(() => remaining.toFixed(2));
  const [date, setDate] = useState(todayInputValue);
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function submit() {
    const value = Number(amount);
    const paidAt = new Date(date);
    startTransition(async () => {
      try {
        await addTeacherPayout(teacherId, year, month, value, paidAt);
        toast.success("Pagamento registrado.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao registrar pagamento.");
      }
    });
  }

  function remove(id: string) {
    setPendingDeleteId(id);
    startTransition(async () => {
      try {
        await deleteTeacherPayout(id);
        toast.success("Pagamento removido.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao remover pagamento.");
      } finally {
        setPendingDeleteId(null);
      }
    });
  }

  return (
    <div className="min-w-56 space-y-1.5 py-1">
      <p className="text-sm">
        Total: <span className="font-semibold">{formatCurrency(total)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {entries.map((e) => (
          <span
            key={e.id}
            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs"
          >
            {formatCurrency(e.amount)} · {formatDate(e.paidAt)}
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              disabled={isPending && pendingDeleteId === e.id}
              onClick={() => remove(e.id)}
              aria-label="Remover pagamento"
            >
              {isPending && pendingDeleteId === e.id ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3" />
              )}
            </button>
          </span>
        ))}

        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              setAmount(remaining.toFixed(2));
              setDate(todayInputValue());
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="size-6">
              <Plus className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`payout-amount-${teacherId}`}>Valor pago</Label>
                <Input
                  id={`payout-amount-${teacherId}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`payout-date-${teacherId}`}>Data do pagamento</Label>
                <Input
                  id={`payout-date-${teacherId}`}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <Button type="button" size="sm" className="w-full" disabled={isPending} onClick={submit}>
                {isPending && <Loader2 className="animate-spin" />}
                Adicionar pagamento
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
