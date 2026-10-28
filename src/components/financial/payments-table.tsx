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
  bankAccountLabel,
  paymentStatusLabel,
} from "@/lib/labels";
import { PaymentStatusSelect } from "@/components/financial/payment-status-select";
import type { PaymentStatus, BankAccount } from "@prisma/client";

type Row = {
  id: string | null;
  studentId: string;
  payerName: string | null;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: PaymentStatus;
  studentName: string;
  teacherName: string | null;
  bankAccount: BankAccount;
};

export function PaymentsTable({
  payments,
  referenceMonth,
  initialStatus,
}: {
  payments: Row[];
  // The month being viewed — passed through to status changes so they
  // always target that month's cobrança, not whatever month "today" is in.
  referenceMonth: Date;
  // Pre-fills the Status filter — e.g. arriving from the "Pagos" stat card.
  // Pass a `key` on this component tied to this value from the caller so a
  // click on a different stat card actually resets the filter (a prop
  // change alone won't re-run useState's initializer on an already-
  // mounted instance).
  initialStatus?: PaymentStatus;
}) {
  const [filters, setFilters] = useState({
    aluno: "",
    professor: "",
    vencimento: "",
    conta: "",
    status: initialStatus ? paymentStatusLabel[initialStatus] : "",
  });

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const filteredPayments = payments.filter((p) => {
    const aluno = filters.aluno.trim().toLowerCase();
    const professor = filters.professor.trim().toLowerCase();
    const vencimento = filters.vencimento.trim().toLowerCase();
    const conta = filters.conta.trim().toLowerCase();
    const status = filters.status.trim().toLowerCase();
    return (
      (!aluno || p.studentName.toLowerCase().includes(aluno)) &&
      (!professor || (p.teacherName ?? "").toLowerCase().includes(professor)) &&
      (!vencimento || formatCalendarDate(p.dueDate).toLowerCase().includes(vencimento)) &&
      (!conta || bankAccountLabel[p.bankAccount].toLowerCase().includes(conta)) &&
      (!status || paymentStatusLabel[p.status].toLowerCase().includes(status))
    );
  });
  const emptyMessage =
    payments.length === 0 ? "Nenhum aluno ativo no momento." : "Nenhum resultado para esses filtros.";

  return (
    <div className="space-y-3">
      {/* Mobile: filter inputs above a stacked card per payment, instead of
          a 7-column table that needed horizontal scrolling to reach
          Conta/Status. */}
      <div className="space-y-3 md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={filters.aluno}
            onChange={(e) => setFilter("aluno", e.target.value)}
            placeholder="Aluno..."
            className="h-8 text-xs"
          />
          <Input
            value={filters.professor}
            onChange={(e) => setFilter("professor", e.target.value)}
            placeholder="Professor..."
            className="h-8 text-xs"
          />
          <Input
            value={filters.vencimento}
            onChange={(e) => setFilter("vencimento", e.target.value)}
            placeholder="Vencimento..."
            className="h-8 text-xs"
          />
          <Input
            value={filters.conta}
            onChange={(e) => setFilter("conta", e.target.value)}
            placeholder="Conta..."
            className="h-8 text-xs"
          />
          <Input
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            placeholder="Status..."
            className="col-span-2 h-8 text-xs"
          />
        </div>

        <div className="space-y-3">
          {filteredPayments.map((p) => (
            <div key={`${p.studentId}::${p.payerName ?? ""}`} className="space-y-2 rounded-xl border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.studentName}</p>
                  <p className="text-xs text-muted-foreground">Prof. {p.teacherName ?? "—"}</p>
                </div>
                <p className="shrink-0 font-medium">{formatCurrency(p.amount)}</p>
              </div>
              {p.payerName && (
                <p className="text-xs text-muted-foreground">Pagador: {p.payerName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Vence {formatCalendarDate(p.dueDate)} · {bankAccountLabel[p.bankAccount]}
              </p>
              <PaymentStatusSelect
                studentId={p.studentId}
                payerName={p.payerName}
                status={p.status}
                paidAt={p.paidAt}
                referenceMonth={referenceMonth}
              />
            </div>
          ))}
          {filteredPayments.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      </div>

      {/* Desktop/tablet: the full table, unchanged. */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Pagador</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-1.5">
                <Input
                  value={filters.aluno}
                  onChange={(e) => setFilter("aluno", e.target.value)}
                  placeholder="Pesquisar..."
                  className="h-8 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="py-1.5">
                <Input
                  value={filters.professor}
                  onChange={(e) => setFilter("professor", e.target.value)}
                  placeholder="Pesquisar..."
                  className="h-8 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="py-1.5" />
              <TableHead className="py-1.5" />
              <TableHead className="py-1.5">
                <Input
                  value={filters.vencimento}
                  onChange={(e) => setFilter("vencimento", e.target.value)}
                  placeholder="Pesquisar..."
                  className="h-8 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="py-1.5">
                <Input
                  value={filters.conta}
                  onChange={(e) => setFilter("conta", e.target.value)}
                  placeholder="Pesquisar..."
                  className="h-8 text-xs font-normal"
                />
              </TableHead>
              <TableHead className="py-1.5">
                <Input
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                  placeholder="Pesquisar..."
                  className="h-8 text-xs font-normal"
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((p) => (
              <TableRow key={`${p.studentId}::${p.payerName ?? ""}`}>
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
                    status={p.status}
                    paidAt={p.paidAt}
                    referenceMonth={referenceMonth}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
