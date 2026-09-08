import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFinancialSummary } from "@/server/queries/financial";
import { formatCurrency } from "@/lib/labels";

export default async function AdminParceirosPage() {
  const { partnerSplit } = await getFinancialSummary();

  const partners = [
    { name: "Joe", previsto: partnerSplit.previsto.joe, realizado: partnerSplit.realizado.joe },
    { name: "Gabriel", previsto: partnerSplit.previsto.gabriel, realizado: partnerSplit.realizado.gabriel },
  ];

  return (
    <div>
      <Link
        href="/admin/financial/gastos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Gastos
      </Link>

      <PageHeader
        title="Parceiros"
        description="O que sobra da receita do mês depois de pagar os professores é dividido em 3 — 1/3 para cada sócio, 1/3 fica para a escola. Sempre referente ao mês atual."
      />

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sócio</TableHead>
              <TableHead>Previsto</TableHead>
              <TableHead>Realizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((p) => (
              <TableRow key={p.name}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{formatCurrency(p.previsto)}</TableCell>
                <TableCell>{formatCurrency(p.realizado)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total (Parceiros)</TableCell>
              <TableCell>{formatCurrency(partnerSplit.previsto.partnersTotal)}</TableCell>
              <TableCell>{formatCurrency(partnerSplit.realizado.partnersTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
