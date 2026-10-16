"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { createManualPayment } from "@/server/actions/payments";
import { useActionToast } from "@/hooks/use-action-toast";
import { bankAccountLabel, paymentStatusLabel } from "@/lib/labels";
import type { BankAccount, PaymentStatus } from "@prisma/client";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Registers a brand-new cobrança by hand — amount, due date, bank account
// and status all typed in directly, instead of only being reachable via a
// placeholder the cadastro's billing config happened to generate. Mirrors
// ExpenseFormDialog's "Cadastrar gasto" flow. This is additive: it doesn't
// change how any existing row behaves, and sits alongside the cadastro-
// driven placeholders and "Atualizar cobranças" for now.
export function AddPaymentDialog({
  studentId,
  defaultBankAccount,
}: {
  studentId: string;
  defaultBankAccount: BankAccount;
}) {
  const [state, formAction, isPending] = useActionState(createManualPayment, undefined);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus /> Adicionar cobrança
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar cobrança</DialogTitle>
          <DialogDescription>
            Cria uma nova cobrança para um mês específico, com valor, vencimento e conta
            definidos aqui — sem alterar o cadastro. Use isso para um mês que ainda não
            aparece na tabela.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="studentId" value={studentId} />

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="payerName">Pagador (deixe em branco para o próprio aluno)</Label>
            <Input id="payerName" name="payerName" placeholder="ex.: nome de um terceiro ou integrante do grupo" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="referenceMonth">Mês de referência</Label>
            <Input id="referenceMonth" name="referenceMonth" type="month" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Vencimento</Label>
            <DateInput id="dueDate" name="dueDate" required />
          </div>

          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            <Select name="bankAccount" defaultValue={defaultBankAccount} required>
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
            <Label>Status</Label>
            <Select
              name="status"
              value={status}
              onValueChange={(v) => setStatus(v as PaymentStatus)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentStatusLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === "PAID" && (
            <div className="space-y-1.5">
              <Label htmlFor="paidAt">Pago em</Label>
              <DateInput id="paidAt" name="paidAt" defaultValue={toIsoDate(new Date())} />
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="note">Observação (opcional)</Label>
            <Textarea id="note" name="note" placeholder="ex.: cobrança retroativa, mês que faltava..." />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Adicionar cobrança
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
