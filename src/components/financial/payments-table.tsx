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
} from "@/lib/labels";
import { markPaymentPaid } from "@/server/actions/payments";
import type { Payment, StudentProfile, User } from "@prisma/client";

type Row = Payment & { student: StudentProfile & { user: User } };

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
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.student.user.name}</TableCell>
              <TableCell>{formatCurrency(p.amount.toString())}</TableCell>
              <TableCell>{formatDate(p.dueDate)}</TableCell>
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
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Nenhuma cobrança gerada para este mês ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
