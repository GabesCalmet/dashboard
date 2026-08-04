import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, bankAccountLabel } from "@/lib/labels";
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
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aluno</TableHead>
            <TableHead>Pagador</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={`${p.studentId}::${p.payerName ?? ""}`}>
              <TableCell>{p.studentName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.payerName ?? "Aluno"}
              </TableCell>
              <TableCell>{formatCurrency(p.amount)}</TableCell>
              <TableCell>{formatDate(p.dueDate)}</TableCell>
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
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhum aluno ativo no momento.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
