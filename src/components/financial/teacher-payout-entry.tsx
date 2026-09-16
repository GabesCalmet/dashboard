"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTeacherPayout, deleteTeacherPayout } from "@/server/actions/payouts";
import { formatCurrency, formatDate, bankAccountLabel } from "@/lib/labels";
import type { BankAccount } from "@prisma/client";

export type PayoutEntry = { id: string; amount: number; paidAt: Date; bankAccount: BankAccount };

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// One recorded teacher payment, editable in place — click it to open a
// small form (amount, date, account) with Salvar/remove, instead of only
// being able to delete and re-add. Shared by the Pagamento de
// professores list (compact "chip" variant) and the per-teacher
// breakdown page (full-width "row" variant).
export function TeacherPayoutEntry({
  entry,
  variant = "chip",
}: {
  entry: PayoutEntry;
  variant?: "chip" | "row";
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(() => entry.amount.toFixed(2));
  const [date, setDate] = useState(() => toInputDate(entry.paidAt));
  const [bankAccount, setBankAccount] = useState<BankAccount>(entry.bankAccount);
  const [isPending, startTransition] = useTransition();

  function resetToEntry() {
    setAmount(entry.amount.toFixed(2));
    setDate(toInputDate(entry.paidAt));
    setBankAccount(entry.bankAccount);
  }

  function save() {
    const value = Number(amount);
    const paidAt = new Date(date);
    startTransition(async () => {
      try {
        await updateTeacherPayout(entry.id, value, paidAt, bankAccount);
        toast.success("Pagamento atualizado.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar pagamento.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteTeacherPayout(entry.id);
        toast.success("Pagamento removido.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao remover pagamento.");
      }
    });
  }

  const label = `${formatCurrency(entry.amount)} · ${formatDate(entry.paidAt)} · ${bankAccountLabel[entry.bankAccount]}`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToEntry();
      }}
    >
      <PopoverTrigger asChild>
        {variant === "chip" ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs hover:border-accent"
          >
            {label}
            <Pencil className="size-3 text-muted-foreground" />
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-sm hover:border-accent"
          >
            <span>{label}</span>
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-amount-${entry.id}`}>Valor pago</Label>
            <Input
              id={`edit-amount-${entry.id}`}
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-date-${entry.id}`}>Data do pagamento</Label>
            <Input
              id={`edit-date-${entry.id}`}
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
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" disabled={isPending} onClick={save}>
              {isPending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={isPending}
              onClick={remove}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
