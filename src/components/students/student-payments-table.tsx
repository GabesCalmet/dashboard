"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate, paymentStatusLabel, paymentStatusVariant } from "@/lib/labels";
import type { Payment } from "@prisma/client";

export function StudentPaymentsTable({ payments }: { payments: Payment[] }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const filteredPayments = payments.filter(
    (p) => new Date(p.referenceMonth).getFullYear() === year
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-16 text-center text-sm font-medium">{year}</span>
        <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano">
          <ChevronRight className="size-4" />
        </Button>
        <Input
          type="number"
          value={year}
          onChange={(e) => e.target.value && setYear(Number(e.target.value))}
          className="w-24"
          aria-label="Ir para o ano"
        />
      </div>

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
            {filteredPayments.map((p) => (
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
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum pagamento registrado neste ano.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
