"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTeacherPayout, deleteTeacherPayout } from "@/server/actions/payouts";
import { formatCurrency, formatDate } from "@/lib/labels";

type Entry = { id: string; amount: number; paidAt: Date };

// One teacher's payments for one month — each entry typed in by hand (so
// installments are just several entries), with its own delete, plus a
// form to log another. The sum of these entries is what counts as this
// teacher's "Realizado" everywhere else (Gasto efetuado, Em caixa, the
// Gastos page's Professores box, and this teacher's row on the
// Pagamento de professores list).
export function TeacherPayoutSection({
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
  const [amount, setAmount] = useState(() => remaining.toFixed(2));
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function submit() {
    const value = Number(amount);
    startTransition(async () => {
      try {
        await addTeacherPayout(teacherId, year, month, value);
        toast.success("Pagamento registrado.");
        setAmount(Math.max(0, remaining - value).toFixed(2));
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
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Pagamentos deste mês</p>
        <p className="text-sm text-muted-foreground">
          Total pago: <span className="font-semibold text-foreground">{formatCurrency(total)}</span> de{" "}
          {formatCurrency(previsto)} previsto
        </p>
      </div>

      {entries.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
              <span>{formatCurrency(e.amount)}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatDate(e.paidAt)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  disabled={isPending && pendingDeleteId === e.id}
                  onClick={() => remove(e.id)}
                >
                  {isPending && pendingDeleteId === e.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="max-w-40"
          aria-label="Valor pago"
        />
        <Button type="button" size="sm" disabled={isPending} onClick={submit}>
          {isPending && pendingDeleteId === null && <Loader2 className="animate-spin" />}
          <Plus className="size-3.5" /> Registrar pagamento
        </Button>
      </div>
    </div>
  );
}
