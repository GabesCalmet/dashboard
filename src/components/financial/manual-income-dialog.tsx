"use client";

import { useActionState, useState } from "react";
import { Loader2, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createManualIncome } from "@/server/actions/manual-income";
import { useActionToast } from "@/hooks/use-action-toast";
import { bankAccountLabel } from "@/lib/labels";

// A one-off cash-in entry not tied to any student's billing cycle — e.g.
// backfilling a historical lump sum so a bank account's running balance
// reflects reality. Only ever counted in "Saldo por conta bancária", not
// in any month's own Receita figures (those stay strictly Payment-based).
export function ManualIncomeDialog({ defaultDate }: { defaultDate?: string }) {
  const [state, formAction, isPending] = useActionState(createManualIncome, undefined);
  const [open, setOpen] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PiggyBank />
          Registrar entrada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar entrada</DialogTitle>
          <DialogDescription>
            Para dinheiro que entrou numa conta mas não é mensalidade de aluno — ex.: um valor
            histórico de anos anteriores que precisa contar no saldo da conta.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            <Select name="bankAccount" defaultValue="JOE" required>
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

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="date">Data</Label>
            <DateInput id="date" name="date" defaultValue={defaultDate} required />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Registrar entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
