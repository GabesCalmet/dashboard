"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTeacherPayout } from "@/server/actions/payouts";
import { PayoutEntry, type PayoutEntryData } from "@/components/financial/payout-entry";
import { formatCurrency, bankAccountLabel } from "@/lib/labels";
import type { BankAccount } from "@prisma/client";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// One teacher's payments for one month — each entry is editable in place
// (click it to change the amount/date/account, or remove it — see
// PayoutEntry), plus a form to log another. The sum of these entries is
// what counts as this teacher's "Realizado" everywhere else (Gasto
// efetuado, Em caixa, the Gastos page's Professores box, and this
// teacher's row on the Pagamento de professores list). lifetimeTotal is
// this teacher's running total across every month, not just this one.
export function TeacherPayoutSection({
  teacherId,
  year,
  month,
  previsto,
  entries,
  lifetimeTotal,
}: {
  teacherId: string;
  year: number;
  month: number;
  previsto: number;
  entries: PayoutEntryData[];
  lifetimeTotal: number;
}) {
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const remaining = Math.max(0, previsto - total);
  const [amount, setAmount] = useState(() => remaining.toFixed(2));
  const [date, setDate] = useState(todayInputValue);
  const [bankAccount, setBankAccount] = useState<BankAccount>("JOE");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const value = Number(amount);
    const paidAt = new Date(date);
    startTransition(async () => {
      try {
        await addTeacherPayout(teacherId, year, month, value, paidAt, bankAccount);
        toast.success("Pagamento registrado.");
        setAmount(Math.max(0, remaining - value).toFixed(2));
        setDate(todayInputValue());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao registrar pagamento.");
      }
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <p className="text-sm font-medium">Pagamentos deste mês</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            Total pago: <span className="font-semibold text-foreground">{formatCurrency(total)}</span> de{" "}
            {formatCurrency(previsto)} previsto
          </span>
          <span>
            Total pago a este professor (todos os meses):{" "}
            <span className="font-semibold text-foreground">{formatCurrency(lifetimeTotal)}</span>
          </span>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {entries.map((e) => (
            <PayoutEntry key={e.id} entry={e} variant="row" />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`payout-amount-${teacherId}-${year}-${month}`}>Valor pago</Label>
          <Input
            id={`payout-amount-${teacherId}-${year}-${month}`}
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`payout-date-${teacherId}-${year}-${month}`}>Data do pagamento</Label>
          <Input
            id={`payout-date-${teacherId}-${year}-${month}`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Conta</Label>
          <Select value={bankAccount} onValueChange={(v) => setBankAccount(v as BankAccount)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(bankAccountLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={submit}>
          {isPending && <Loader2 className="animate-spin" />}
          <Plus className="size-3.5" /> Registrar pagamento
        </Button>
      </div>
    </div>
  );
}
