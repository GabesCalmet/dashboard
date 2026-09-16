"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTeacherPayout } from "@/server/actions/payouts";
import { TeacherPayoutEntry, type PayoutEntry } from "@/components/financial/teacher-payout-entry";
import { formatCurrency, bankAccountLabel } from "@/lib/labels";
import type { BankAccount } from "@prisma/client";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// The "Realizado" cell on the Pagamento de professores list — every
// payment made to this teacher this month shows as its own editable chip
// (click it to change the amount/date/account, or remove it — see
// TeacherPayoutEntry), with a "+" to log another and a fixed Total that
// sums them all. Amount/date/account for a new payment default to
// whatever's still owed against Previsto, today, and Joe respectively —
// all editable before or after saving.
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
  entries: PayoutEntry[];
}) {
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const remaining = Math.max(0, previsto - total);
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao registrar pagamento.");
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
          <TeacherPayoutEntry key={e.id} entry={e} variant="chip" />
        ))}

        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              setAmount(remaining.toFixed(2));
              setDate(todayInputValue());
              setBankAccount("JOE");
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
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Select value={bankAccount} onValueChange={(v) => setBankAccount(v as BankAccount)}>
                  <SelectTrigger className="w-full">
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
