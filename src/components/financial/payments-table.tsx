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
  amount: number;
  dueDate: Date;
  status: PaymentStatus;
  studentName: string;
  bankAccount: BankAccount;
};

export function PaymentsTable({ payments }: { payments: Row[] }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aluno</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id ?? p.studentId}>
              <TableCell>{p.studentName}</TableCell>
              <TableCell>{formatCurrency(p.amount)}</TableCell>
              <TableCell>{formatDate(p.dueDate)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {bankAccountLabel[p.bankAccount]}
              </TableCell>
              <TableCell>
                <PaymentStatusSelect studentId={p.studentId} status={p.status} />
              </TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Nenhum aluno ativo no momento.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
