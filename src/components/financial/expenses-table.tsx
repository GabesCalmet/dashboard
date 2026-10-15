"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, CalendarOff } from "lucide-react";
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
import { ExpenseFormDialog } from "@/components/financial/expense-form-dialog";
import { ExpenseOccurrenceStatusSelect } from "@/components/financial/expense-occurrence-status-select";
import { ExpenseAmountOverrideButton } from "@/components/financial/expense-amount-override-dialog";
import { ExpenseBankAccountSelect } from "@/components/financial/expense-bank-account-select";
import { PartnerPayoutCell } from "@/components/financial/partner-payout-cell";
import type { PayoutEntryData } from "@/components/financial/payout-entry";
import {
  formatCurrency,
  formatCalendarDate,
  expenseFrequencyLabel,
  expenseCategoryLabel,
} from "@/lib/labels";
import { deleteExpense, endRecurringExpense } from "@/server/actions/expenses";
import type { Expense, ExpenseCategory, BankAccount, PaymentStatus } from "@prisma/client";

type Row = {
  id: string;
  description: string;
  amount: number;
  frequency: Expense["frequency"];
  category: ExpenseCategory;
  date: Date;
  // This month's actual date for the expense — same as `date` for ONE_TIME,
  // or dayOfMonth clamped into the viewed month for RECURRING.
  occurrenceDate: Date;
  dayOfMonth: number | null;
  endDate: Date | null;
  bankAccount: BankAccount;
  notes: string | null;
  // This specific month's own confirmation — see ExpenseOccurrence. Never
  // shared across months of the same recurring expense.
  occurrenceStatus: PaymentStatus;
  occurrencePaidAt: Date | null;
  // This month's actually-charged amount (the override when one's set,
  // otherwise `amount`) and the override itself, if any — also never
  // shared across months of the same recurring expense.
  effectiveAmount: number;
  amountOverride: number | null;
  amountOverrideNote: string | null;
  // Which account this month's bill actually came out of — the override
  // when one's set, otherwise `bankAccount`. Also never shared across
  // months of the same recurring expense.
  effectiveBankAccount: BankAccount;
  bankAccountOverride: BankAccount | null;
};

// Joe/Gabriel's own monthly payout — not an Expense row at all (see the
// Payout model), shown inline as its own row using the exact same
// Pagamento cell the old dedicated /gastos/parceiros page used, so
// nothing about tracking split/partial payments is lost by folding it
// into this table.
type PartnerRow = {
  name: string;
  kind: "PARTNER_JOE" | "PARTNER_GABRIEL";
  previsto: number;
  entries: PayoutEntryData[];
};

export function ExpensesTable({
  expenses,
  partners,
  year,
  month,
}: {
  expenses: Row[];
  partners?: PartnerRow[];
  year?: number;
  month?: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => {
            const ended = e.frequency === "RECURRING" && e.endDate && e.endDate <= new Date();
            return (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {formatCurrency(e.effectiveAmount)}
                    {/* occurrenceDate is UTC midnight of the intended calendar day
                        (built server-side) — this component is "use client", so
                        plain getFullYear()/getMonth() would read it in the
                        browser's own Brazil (UTC-3) time instead, which rolls a
                        day-1 occurrence back into the PREVIOUS month. Reading the
                        UTC components keeps this referenceMonth matching the
                        month this row is actually being shown under. */}
                    <ExpenseAmountOverrideButton
                      expenseId={e.id}
                      referenceMonth={
                        new Date(e.occurrenceDate.getUTCFullYear(), e.occurrenceDate.getUTCMonth(), 1)
                      }
                      amount={e.amount}
                      amountOverride={e.amountOverride}
                      amountOverrideNote={e.amountOverrideNote}
                    />
                  </div>
                  {e.amountOverride != null && e.amountOverrideNote && (
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      {e.amountOverrideNote}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {expenseCategoryLabel[e.category]}
                </TableCell>
                <TableCell>
                  <ExpenseBankAccountSelect
                    expenseId={e.id}
                    referenceMonth={
                      new Date(e.occurrenceDate.getUTCFullYear(), e.occurrenceDate.getUTCMonth(), 1)
                    }
                    bankAccount={e.bankAccount}
                    bankAccountOverride={e.bankAccountOverride}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{expenseFrequencyLabel[e.frequency]}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatCalendarDate(e.occurrenceDate)}
                  {e.frequency === "RECURRING" &&
                    ` (recorrente${e.endDate ? `, até ${formatCalendarDate(e.endDate)}` : ""})`}
                </TableCell>
                <TableCell>
                  {e.frequency === "RECURRING" ? (
                    <Badge variant={ended ? "outline" : "success"}>
                      {ended ? "Encerrado" : "Ativo"}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <ExpenseOccurrenceStatusSelect
                    expenseId={e.id}
                    referenceMonth={
                      new Date(e.occurrenceDate.getUTCFullYear(), e.occurrenceDate.getUTCMonth(), 1)
                    }
                    status={e.occurrenceStatus}
                    paidAt={e.occurrencePaidAt}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ExpenseFormDialog
                      expense={{
                        id: e.id,
                        description: e.description,
                        amount: e.amount,
                        frequency: e.frequency,
                        date: e.date.toISOString().slice(0, 10),
                        dayOfMonth: e.dayOfMonth,
                        endDate: e.endDate?.toISOString().slice(0, 10),
                        bankAccount: e.bankAccount,
                        notes: e.notes,
                      }}
                    />
                    {e.frequency === "RECURRING" && !ended && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await endRecurringExpense(e.id);
                            toast.success("Gasto recorrente encerrado.");
                          })
                        }
                      >
                        <CalendarOff /> Encerrar
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir gasto</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é permanente e remove o registro de &quot;{e.description}&quot;.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={isPending}
                            onClick={(ev) => {
                              ev.preventDefault();
                              startTransition(async () => {
                                await deleteExpense(e.id);
                                toast.success("Gasto excluído.");
                              });
                            }}
                          >
                            {isPending && <Loader2 className="animate-spin" />}
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {partners != null &&
            year !== undefined &&
            month !== undefined &&
            partners.map((p) => (
              <TableRow key={p.kind}>
                <TableCell className="font-medium">Parceiros — {p.name}</TableCell>
                <TableCell>{formatCurrency(p.previsto)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">Parceiros</TableCell>
                <TableCell className="text-sm text-muted-foreground">—</TableCell>
                <TableCell className="text-sm text-muted-foreground">—</TableCell>
                <TableCell className="text-sm text-muted-foreground">—</TableCell>
                <TableCell className="text-sm text-muted-foreground">—</TableCell>
                <TableCell>
                  <PartnerPayoutCell kind={p.kind} year={year} month={month} entries={p.entries} />
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
              </TableRow>
            ))}
          {expenses.length === 0 && (!partners || partners.length === 0) && (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                Nenhum gasto neste mês.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
