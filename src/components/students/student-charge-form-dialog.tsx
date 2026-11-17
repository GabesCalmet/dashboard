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
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStudentCharge, updateStudentCharge } from "@/server/actions/student-charges";
import { useActionToast } from "@/hooks/use-action-toast";
import { bankAccountLabel } from "@/lib/labels";
import type { ExpenseFrequency, BankAccount } from "@prisma/client";

type ChargeDefaults = {
  id: string;
  payerName: string | null;
  description: string | null;
  amount: number;
  frequency: ExpenseFrequency;
  date: string;
  dueDay: number | null;
  endDate?: string;
  bankAccount: BankAccount;
};

// "Adicionar cobrança" — mirrors ExpenseFormDialog exactly (see
// createExpense/updateExpense), with one addition: payerName, since one
// cadastro can have several concurrent charges. Único creates a single
// Payment row for that date; Recorrente generates one per month from the
// start date through an optional end date — see materializeStudentCharge.
export function StudentChargeFormDialog({
  studentId,
  charge,
  defaultBankAccount,
}: {
  studentId: string;
  charge?: ChargeDefaults;
  defaultBankAccount: BankAccount;
}) {
  const isEdit = Boolean(charge);
  const action = isEdit ? updateStudentCharge.bind(null, charge!.id) : createStudentCharge;
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<ExpenseFrequency>(charge?.frequency ?? "RECURRING");
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={isEdit ? "sm" : "default"} variant={isEdit ? "outline" : "default"}>
          {isEdit ? <Pencil /> : <Plus />}
          {isEdit ? "Editar" : "Adicionar cobrança"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cobrança" : "Adicionar cobrança"}</DialogTitle>
          <DialogDescription>
            Uma cobrança pode ser única (um mês específico) ou recorrente (repete todo mês até
            ser encerrada). Fica totalmente separada do cadastro.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="studentId" value={studentId} />

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="payerName">Pagador (deixe em branco para o próprio aluno)</Label>
            <Input
              id="payerName"
              name="payerName"
              placeholder="ex.: nome de um terceiro ou integrante do grupo"
              defaultValue={charge?.payerName ?? ""}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input id="description" name="description" defaultValue={charge?.description ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={charge?.amount}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            <Select name="bankAccount" defaultValue={charge?.bankAccount ?? defaultBankAccount} required>
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
            <Label htmlFor="date">{frequency === "RECURRING" ? "Início da cobrança" : "Data"}</Label>
            <DateInput id="date" name="date" defaultValue={charge?.date} required />
          </div>

          {frequency === "RECURRING" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="dueDay">Dia de vencimento</Label>
                <Input
                  id="dueDay"
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={charge?.dueDay ?? undefined}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">Encerra em (opcional)</Label>
                <DateInput id="endDate" name="endDate" defaultValue={charge?.endDate} />
              </div>
            </>
          )}

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Salvar alterações" : "Adicionar cobrança"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
