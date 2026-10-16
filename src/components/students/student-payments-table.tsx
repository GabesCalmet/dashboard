"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PaymentStatusSelect } from "@/components/financial/payment-status-select";
import { PaymentOverrideButton } from "@/components/students/payment-override-dialog";
import { PaymentBankAccountSelect } from "@/components/students/payment-bank-account-select";
import { deletePayment } from "@/server/actions/payments";
import {
  formatCurrency,
  formatDate,
  formatCalendarDate,
  formatCalendarMonthYear,
  paymentStatusLabel,
  paymentStatusVariant,
  bankAccountLabel,
} from "@/lib/labels";
import type { PaymentStatus, BankAccount } from "@prisma/client";

export type PaymentHistoryRow = {
  id: string | null;
  payerName: string | null;
  amount: number;
  referenceMonth: Date;
  dueDate: Date;
  paidAt: Date | null;
  status: PaymentStatus;
  bankAccount: BankAccount;
  effectiveBankAccount: BankAccount;
  bankAccountOverride: BankAccount | null;
  manualOverride: boolean;
  manualOverrideNote: string | null;
};

export function StudentPaymentsTable({
  payments,
  studentId,
  studentName,
  editable = false,
}: {
  payments: PaymentHistoryRow[];
  studentId: string;
  // The primary/owner student's own name — shown for any row with no
  // payerName (their own billing slot), instead of a generic "Aluno" that
  // doesn't say which of a "grupo" cadastro's several names it actually is.
  studentName: string;
  // Lets an admin change a cobrança's status directly from the student's
  // own page — same action (setCobrancaStatus) the admin Cobranças table
  // uses, so it works for both real rows and not-yet-generated placeholders.
  editable?: boolean;
}) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [isPending, startTransition] = useTransition();
  const filteredPayments = payments.filter(
    (p) => new Date(p.referenceMonth).getUTCFullYear() === year
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-16 text-center text-sm font-medium">{year}</span>
        <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano">
          <ChevronRight className="size-4" />
        </Button>
        <Input
          type="number"
          value={year}
          onChange={(e) => e.target.value && setYear(Number(e.target.value))}
          className="w-24"
          aria-label="Ir para o ano"
        />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referência</TableHead>
              <TableHead>Pagador</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Pago em</TableHead>
              <TableHead>Status</TableHead>
              {editable && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((p) => (
              <TableRow key={p.id ?? `${p.referenceMonth.toISOString()}::${p.payerName ?? ""}`}>
                <TableCell>{formatCalendarMonthYear(p.referenceMonth)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.payerName ?? studentName}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <PaymentBankAccountSelect
                      studentId={studentId}
                      payerName={p.payerName}
                      referenceMonth={p.referenceMonth}
                      bankAccount={p.bankAccount}
                      bankAccountOverride={p.bankAccountOverride}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {bankAccountLabel[p.effectiveBankAccount]}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {formatCurrency(p.amount)}
                    {editable && (
                      <PaymentOverrideButton
                        studentId={studentId}
                        payerName={p.payerName}
                        referenceMonth={p.referenceMonth}
                        amount={p.amount}
                        dueDate={p.dueDate}
                        manualOverride={p.manualOverride}
                        manualOverrideNote={p.manualOverrideNote}
                        label="Ajustar valor deste mês"
                      />
                    )}
                  </div>
                  {p.manualOverride && p.manualOverrideNote && (
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      {p.manualOverrideNote}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {formatCalendarDate(p.dueDate)}
                    {editable && (
                      <PaymentOverrideButton
                        studentId={studentId}
                        payerName={p.payerName}
                        referenceMonth={p.referenceMonth}
                        amount={p.amount}
                        dueDate={p.dueDate}
                        manualOverride={p.manualOverride}
                        manualOverrideNote={p.manualOverrideNote}
                        label="Ajustar vencimento deste mês"
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>{p.paidAt ? formatDate(p.paidAt) : "—"}</TableCell>
                <TableCell>
                  {editable ? (
                    <PaymentStatusSelect
                      studentId={studentId}
                      payerName={p.payerName}
                      status={p.status}
                      paidAt={p.paidAt}
                      referenceMonth={p.referenceMonth}
                    />
                  ) : (
                    <Badge variant={paymentStatusVariant[p.status]}>
                      {paymentStatusLabel[p.status]}
                    </Badge>
                  )}
                </TableCell>
                {editable && (
                  <TableCell className="text-right">
                    {/* Only a real row (p.id set) has anything to delete —
                        a not-yet-generated placeholder is never persisted. */}
                    {p.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir cobrança</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove permanentemente esta cobrança de {formatCalendarMonthYear(p.referenceMonth)}{" "}
                              ({formatCurrency(p.amount)}). Use isto só para um lançamento feito por engano — não
                              afeta a definição de cobrança (se ainda existir), nem qualquer outro mês. Não pode
                              ser desfeito.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={isPending}
                              onClick={(ev) => {
                                ev.preventDefault();
                                startTransition(async () => {
                                  try {
                                    await deletePayment(p.id!, studentId);
                                    toast.success("Cobrança excluída.");
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
                                  }
                                });
                              }}
                            >
                              {isPending && <Loader2 className="animate-spin" />}
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={editable ? 8 : 7} className="py-10 text-center text-muted-foreground">
                  Nenhum pagamento registrado neste ano.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
