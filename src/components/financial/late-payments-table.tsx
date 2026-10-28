"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  formatCurrency,
  formatCalendarDate,
  formatCalendarMonthYear,
  bankAccountLabel,
} from "@/lib/labels";
import { PaymentStatusSelect } from "@/components/financial/payment-status-select";
import type { PaymentStatus, BankAccount } from "@prisma/client";

type Row = {
  id: string;
  studentId: string;
  payerName: string | null;
  amount: number;
  dueDate: Date;
  referenceMonth: Date;
  studentName: string;
  teacherName: string | null;
  bankAccount: BankAccount;
};

export function LatePaymentsTable({ payments }: { payments: Row[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? payments.filter((p) =>
        [p.studentName, p.teacherName ?? "", formatCalendarMonthYear(p.referenceMonth)]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : payments;
  const emptyMessage =
    payments.length === 0 ? "Nenhum pagamento em atraso no momento." : "Nenhum resultado para essa pesquisa.";

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pesquisar aluno, professor ou mês..."
        className="max-w-xs"
      />

      {/* Mobile: one card per late payment, instead of an 8-column table
          that needed horizontal scrolling to reach Conta/Status. */}
      <div className="space-y-3 md:hidden">
        {filtered.map((p) => (
          <div key={p.id} className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.studentName}</p>
                <p className="text-xs text-muted-foreground">Prof. {p.teacherName ?? "—"}</p>
              </div>
              <p className="shrink-0 font-medium">{formatCurrency(p.amount)}</p>
            </div>
            {p.payerName && <p className="text-xs text-muted-foreground">Pagador: {p.payerName}</p>}
            <p className="text-xs text-muted-foreground capitalize">
              {formatCalendarMonthYear(p.referenceMonth)} · venceu {formatCalendarDate(p.dueDate)} ·{" "}
              {bankAccountLabel[p.bankAccount]}
            </p>
            <PaymentStatusSelect
              studentId={p.studentId}
              payerName={p.payerName}
              status={"LATE" as PaymentStatus}
              paidAt={null}
              referenceMonth={p.referenceMonth}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{emptyMessage}</p>
        )}
      </div>

      {/* Desktop/tablet: the full table, unchanged. */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês de referência</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Pagador</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="capitalize">{formatCalendarMonthYear(p.referenceMonth)}</TableCell>
                <TableCell>{p.studentName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.teacherName ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.payerName ?? p.studentName}
                </TableCell>
                <TableCell>{formatCurrency(p.amount)}</TableCell>
                <TableCell>{formatCalendarDate(p.dueDate)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {bankAccountLabel[p.bankAccount]}
                </TableCell>
                <TableCell>
                  <PaymentStatusSelect
                    studentId={p.studentId}
                    payerName={p.payerName}
                    status={"LATE" as PaymentStatus}
                    paidAt={null}
                    referenceMonth={p.referenceMonth}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
