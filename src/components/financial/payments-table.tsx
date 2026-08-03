"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
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
  formatCurrency,
  formatDate,
  paymentStatusLabel,
  paymentStatusVariant,
  bankAccountLabel,
} from "@/lib/labels";
import { markPaymentPaid } from "@/server/actions/payments";
import type { PaymentStatus, BankAccount } from "@prisma/client";

type Row = {
  id: string;
  amount: number;
  dueDate: Date;
  status: PaymentStatus;
  studentName: string;
  bankAccount: BankAccount;
};

export function PaymentsTable({ payments }: { payments: Row[] }) {
  const [isPending, startTransition] = useTransition();

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
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.studentName}</TableCell>
              <TableCell>{formatCurrency(p.amount)}</TableCell>
              <TableCell>{formatDate(p.dueDate)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {bankAccountLabel[p.bankAccount]}
              </TableCell>
              <TableCell>
                <Badge variant={paymentStatusVariant[p.status]}>
                  {paymentStatusLabel[p.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {p.status !== "PAID" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await markPaymentPaid(p.id);
                        toast.success("Pagamento marcado como pago.");
                      })
                    }
                  >
                    {isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                    Marcar como pago
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhuma cobrança gerada para este mês ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
