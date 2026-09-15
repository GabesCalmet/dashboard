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

// The "Realizado" cell on the Pagamento de professores list — shows the
// total already paid this month and a "+" to log another payment
// (amount typed by hand, so a teacher paid in installments can have
// several entries). Defaults the input to whatever's still owed against
// Previsto, but that's just a convenience — any amount can be entered.
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
  const [isPending, startTransition] = useTransition();

  function submit() {
    const value = Number(amount);
    startTransition(async () => {
      try {
        await addTeacherPayout(teacherId, year, month, value);
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
          if (next) setAmount(remaining.toFixed(2));
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
