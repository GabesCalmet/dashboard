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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentChargeFormDialog } from "@/components/students/student-charge-form-dialog";
import { deleteStudentCharge, endStudentCharge } from "@/server/actions/student-charges";
import { formatCurrency, formatCalendarDate, bankAccountLabel } from "@/lib/labels";
import { brazilToday } from "@/lib/timezone";
import type { ExpenseFrequency, BankAccount } from "@prisma/client";

export type StudentChargeRow = {
  id: string;
  payerName: string | null;
  description: string | null;
  amount: number;
  frequency: ExpenseFrequency;
  date: Date;
  dueDay: number | null;
  endDate: Date | null;
  bankAccount: BankAccount;
};

// The "+" list on a student's Financeiro tab — every cobrança definition
// (see StudentCharge), independent from the cadastro, mirroring the Gastos
// table's own row layout/actions (Editar/Encerrar/Excluir). The actual
// months this generates show in the Payment history table below —
// editing or deleting here never touches a month already generated.
export function StudentChargesTable({
  studentId,
  studentName,
  charges,
  bankAccount,
  editable,
}: {
  studentId: string;
  studentName: string;
  charges: StudentChargeRow[];
  bankAccount: BankAccount;
  editable: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function endButton(c: StudentChargeRow) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await endStudentCharge(c.id, studentId);
            toast.success("Cobrança encerrada.");
          })
        }
      >
        <CalendarOff /> Encerrar
      </Button>
    );
  }

  function deleteButton(c: StudentChargeRow) {
    return (
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
              Remove esta definição de cobrança. Os meses já gerados a partir dela continuam
              intactos — isto só afeta a geração futura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(ev) => {
                ev.preventDefault();
                startTransition(async () => {
                  await deleteStudentCharge(c.id, studentId);
                  toast.success("Cobrança excluída.");
                });
              }}
            >
              {isPending && <Loader2 className="animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Cobranças cadastradas</CardTitle>
        {editable && <StudentChargeFormDialog studentId={studentId} defaultBankAccount={bankAccount} />}
      </CardHeader>
      <CardContent className="space-y-3 p-3 md:p-0">
        {/* Mobile: one card per cobrança, instead of a 6/7-column table that
            needed horizontal scrolling to reach Vigência/Ações. */}
        <div className="space-y-3 md:hidden">
          {charges.map((c) => {
            const ended = c.frequency === "RECURRING" && c.endDate && c.endDate <= brazilToday();
            return (
              <div key={c.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.payerName ?? studentName}</p>
                    {c.description && (
                      <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <p className="shrink-0 font-medium">{formatCurrency(c.amount)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{bankAccountLabel[c.bankAccount]}</span>
                  <Badge variant="outline">{c.frequency === "RECURRING" ? "Recorrente" : "Único"}</Badge>
                  {c.frequency === "RECURRING" && <span>dia {c.dueDay}</span>}
                  {ended && <Badge variant="outline">Encerrada</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.frequency === "RECURRING"
                    ? `${formatCalendarDate(c.date)} — ${c.endDate ? formatCalendarDate(c.endDate) : "em aberto"}`
                    : formatCalendarDate(c.date)}
                </p>
                {editable && (
                  <div className="flex flex-wrap items-center gap-1 border-t pt-2">
                    <StudentChargeFormDialog
                      studentId={studentId}
                      defaultBankAccount={bankAccount}
                      charge={{
                        id: c.id,
                        payerName: c.payerName,
                        description: c.description,
                        amount: c.amount,
                        frequency: c.frequency,
                        date: c.date.toISOString().slice(0, 10),
                        dueDay: c.dueDay,
                        endDate: c.endDate?.toISOString().slice(0, 10),
                        bankAccount: c.bankAccount,
                      }}
                    />
                    {c.frequency === "RECURRING" && !ended && endButton(c)}
                    {deleteButton(c)}
                  </div>
                )}
              </div>
            );
          })}
          {charges.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">Nenhuma cobrança cadastrada.</p>
          )}
        </div>

        {/* Desktop/tablet: the full table, unchanged. */}
        <div className="hidden overflow-hidden rounded-b-xl border-t md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pagador</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vigência</TableHead>
                {editable && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((c) => {
                const ended = c.frequency === "RECURRING" && c.endDate && c.endDate <= brazilToday();
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.payerName ?? studentName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.description || "—"}
                    </TableCell>
                    <TableCell>{formatCurrency(c.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {bankAccountLabel[c.bankAccount]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {c.frequency === "RECURRING" ? "Recorrente" : "Único"}
                      </Badge>
                      {c.frequency === "RECURRING" && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          dia {c.dueDay}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.frequency === "RECURRING" ? (
                        <>
                          {formatCalendarDate(c.date)} —{" "}
                          {c.endDate ? formatCalendarDate(c.endDate) : "em aberto"}
                          {ended && (
                            <Badge variant="outline" className="ml-1.5">
                              Encerrada
                            </Badge>
                          )}
                        </>
                      ) : (
                        formatCalendarDate(c.date)
                      )}
                    </TableCell>
                    {editable && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <StudentChargeFormDialog
                            studentId={studentId}
                            defaultBankAccount={bankAccount}
                            charge={{
                              id: c.id,
                              payerName: c.payerName,
                              description: c.description,
                              amount: c.amount,
                              frequency: c.frequency,
                              date: c.date.toISOString().slice(0, 10),
                              dueDay: c.dueDay,
                              endDate: c.endDate?.toISOString().slice(0, 10),
                              bankAccount: c.bankAccount,
                            }}
                          />
                          {c.frequency === "RECURRING" && !ended && endButton(c)}
                          {deleteButton(c)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {charges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={editable ? 7 : 6} className="py-8 text-center text-muted-foreground">
                    Nenhuma cobrança cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
