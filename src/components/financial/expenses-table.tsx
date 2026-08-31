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
import {
  formatCurrency,
  formatCalendarDate,
  expenseFrequencyLabel,
  bankAccountLabel,
} from "@/lib/labels";
import { deleteExpense, endRecurringExpense } from "@/server/actions/expenses";
import type { Expense, BankAccount } from "@prisma/client";

type Row = {
  id: string;
  description: string;
  amount: number;
  frequency: Expense["frequency"];
  date: Date;
  // This month's actual date for the expense — same as `date` for ONE_TIME,
  // or dayOfMonth clamped into the viewed month for RECURRING.
  occurrenceDate: Date;
  dayOfMonth: number | null;
  endDate: Date | null;
  bankAccount: BankAccount;
  notes: string | null;
};

export function ExpensesTable({ expenses }: { expenses: Row[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => {
            const ended = e.frequency === "RECURRING" && e.endDate && e.endDate <= new Date();
            return (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell>{formatCurrency(e.amount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {bankAccountLabel[e.bankAccount]}
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
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                Nenhum gasto neste mês.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
