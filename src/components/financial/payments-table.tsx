"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredPayments = q
    ? payments.filter((p) =>
        [
          p.studentName,
          p.teacherName ?? "",
          formatCalendarDate(p.dueDate),
          bankAccountLabel[p.bankAccount],
          paymentStatusLabel[p.status],
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : payments;

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar aluno, professor, vencimento, conta, status..."
          className="pl-9"
        />
      </div>

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
                    : "Nenhum resultado para essa pesquisa."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
