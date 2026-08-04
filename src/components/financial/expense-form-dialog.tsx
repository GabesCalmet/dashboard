"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpense, updateExpense } from "@/server/actions/expenses";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ExpenseFrequency } from "@prisma/client";

type ExpenseDefaults = {
  id: string;
  description: string;
  amount: number;
  frequency: ExpenseFrequency;
  date: string;
  dayOfMonth?: number | null;
  endDate?: string;
  notes?: string | null;
};

export function ExpenseFormDialog({ expense }: { expense?: ExpenseDefaults }) {
  const isEdit = Boolean(expense);
  const action = isEdit ? updateExpense.bind(null, expense!.id) : createExpense;
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<ExpenseFrequency>(expense?.frequency ?? "ONE_TIME");
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={isEdit ? "sm" : "default"} variant={isEdit ? "outline" : "default"}>
          {isEdit ? <Pencil /> : <Plus />}
          {isEdit ? "Editar" : "Cadastrar gasto"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar gasto" : "Cadastrar gasto"}</DialogTitle>
          <DialogDescription>
            Um gasto pode ser único (uma data específica) ou recorrente (repete todo mês).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" defaultValue={expense?.description} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              defaultValue={expense?.amount}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              name="frequency"
              value={frequency}
              onValueChange={(v) => setFrequency(v as ExpenseFrequency)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONE_TIME">Único</SelectItem>
                <SelectItem value="RECURRING">Recorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">
              {frequency === "RECURRING" ? "Início da recorrência" : "Data"}
            </Label>
            <Input id="date" name="date" type="date" defaultValue={expense?.date} required />
          </div>

          {frequency === "RECURRING" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="dayOfMonth">Dia do mês (vencimento)</Label>
                <Input
                  id="dayOfMonth"
                  name="dayOfMonth"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={expense?.dayOfMonth ?? undefined}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">Encerra em (opcional)</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={expense?.endDate} />
              </div>
            </>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={expense?.notes ?? ""} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Salvar alterações" : "Cadastrar gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
