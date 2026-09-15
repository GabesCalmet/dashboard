import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MonthNav } from "@/components/financial/month-nav";
import { PayoutPaidButton } from "@/components/financial/payout-paid-button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPartnerSplitForMonth } from "@/server/queries/financial";
import { getPayout } from "@/server/queries/payouts";
import { parseMonthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function AdminParceirosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const [partnerSplit, joePayout, gabrielPayout] = await Promise.all([
    getPartnerSplitForMonth(year, month),
    getPayout("PARTNER_JOE", null, year, month),
    getPayout("PARTNER_GABRIEL", null, year, month),
  ]);

  const partners = [
    { name: "Joe", kind: "PARTNER_JOE" as const, previsto: partnerSplit.previsto.joe, payout: joePayout },
    {
      name: "Gabriel",
      kind: "PARTNER_GABRIEL" as const,
      previsto: partnerSplit.previsto.gabriel,
      payout: gabrielPayout,
    },
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
        description="O que sobra da receita do mês depois de pagar os professores é dividido em 3 — 1/3 para cada sócio, 1/3 fica para a escola. Previsto é sempre uma previsão ao vivo; só conta como gasto quando marcado como pago."
      />

      <div className="mb-4">
        <MonthNav basePath="/admin/financial/gastos/parceiros" year={year} month={month} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sócio</TableHead>
              <TableHead>Previsto</TableHead>
              <TableHead>Pagamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((p) => (
              <TableRow key={p.name}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{formatCurrency(p.previsto)}</TableCell>
                <TableCell>
                  <PayoutPaidButton
                    kind={p.kind}
                    year={year}
                    month={month}
                    paid={Boolean(p.payout)}
                    amount={p.payout ? Number(p.payout.amount) : null}
                    paidAt={p.payout?.paidAt ?? null}
                  />
                </TableCell>
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
