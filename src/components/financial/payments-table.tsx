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
  status: PaymentStatus;
  studentName: string;
  teacherName: string | null;
  bankAccount: BankAccount;
};

export function PaymentsTable({
  payments,
  referenceMonth,
}: {
  payments: Row[];
  // The month being viewed — passed through to status changes so they
  // always target that month's cobrança, not whatever month "today" is in.
  referenceMonth: Date;
}) {
  const [filters, setFilters] = useState({
    aluno: "",
    professor: "",
    vencimento: "",
    conta: "",
    status: "",
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

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border">
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
                  {p.payerName ?? "Aluno"}
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
                    referenceMonth={referenceMonth}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {payments.length === 0
                    ? "Nenhum aluno ativo no momento."
                    : "Nenhum resultado para esses filtros."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
