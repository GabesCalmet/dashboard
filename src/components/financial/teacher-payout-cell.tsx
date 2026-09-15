"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addTeacherPayout } from "@/server/actions/payouts";
import { formatCurrency } from "@/lib/labels";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// The "Realizado" cell on the Pagamento de professores list — shows the
// total already paid this month and a "+" to log another payment
// (amount and date typed by hand, so a teacher paid in installments can
// have several accurately-dated entries). Defaults the amount to
// whatever's still owed against Previsto and the date to today, but
// both are just convenience defaults — either can be edited.
export function TeacherPayoutCell({
  teacherId,
  year,
  month,
  previsto,
  total,
}: {
  teacherId: string;
  year: number;
  month: number;
  previsto: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const remaining = Math.max(0, previsto - total);
  const [amount, setAmount] = useState(() => remaining.toFixed(2));
  const [date, setDate] = useState(todayInputValue);
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="flex items-center gap-1.5">
      <span>{formatCurrency(total)}</span>
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
          <Button type="button" variant="ghost" size="icon" className="size-6">
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
  );
}
