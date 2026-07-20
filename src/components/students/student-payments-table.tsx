import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, paymentStatusLabel, paymentStatusVariant } from "@/lib/labels";
import type { Payment } from "@prisma/client";

export function StudentPaymentsTable({ payments }: { payments: Payment[] }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referência</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pago em</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
                  p.referenceMonth
                )}
              </TableCell>
              <TableCell>{formatCurrency(p.amount.toString())}</TableCell>
              <TableCell>{formatDate(p.dueDate)}</TableCell>
              <TableCell>{p.paidAt ? formatDate(p.paidAt) : "—"}</TableCell>
              <TableCell>
                <Badge variant={paymentStatusVariant[p.status]}>
                  {paymentStatusLabel[p.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Nenhum pagamento registrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
