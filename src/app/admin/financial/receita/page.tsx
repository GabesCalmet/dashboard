import Link from "next/link";
import { ArrowLeft, Wallet, TrendingUp, AlertTriangle, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashFlowChart } from "@/components/financial/cash-flow-chart";
import { PaymentsTable } from "@/components/financial/payments-table";
import { GenerateBillingButton } from "@/components/financial/generate-billing-button";
import { MonthNav } from "@/components/financial/month-nav";
import { getFinancialOverview } from "@/server/queries/financial";
import { parseMonthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function AdminFinancialReceitaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const data = await getFinancialOverview(year, month);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );

  return (
    <div>
      <Link
        href="/admin/financial"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Financeiro
      </Link>

      <PageHeader
        title="Receita"
        description="Mensalidades, cobranças e fluxo de caixa recebido."
        actions={<GenerateBillingButton year={year} month={month} />}
      />

      <div className="mb-4">
        <MonthNav basePath="/admin/financial/receita" year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Receita prevista"
          value={formatCurrency(data.monthlyRevenueExpected)}
          icon={Wallet}
        />
        <StatCard
          label="Receita recebida"
          value={formatCurrency(data.monthlyRevenueReceived)}
          icon={TrendingUp}
          accent
        />
        <StatCard label="Pagamentos pendentes" value={String(data.pendingCount)} icon={Clock3} />
        <StatCard
          label="Inadimplência"
          value={`${data.delinquencyRate.toFixed(1)}%`}
          icon={AlertTriangle}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Fluxo de caixa — 6 meses até {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={data.cashFlow} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="capitalize">Receita por conta bancária — {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {data.byBankAccount.map((b) => (
              <div key={b.account} className="rounded-lg border p-4">
                <p className="text-sm font-medium">{b.label}</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(b.received)}</p>
                <p className="text-xs text-muted-foreground">
                  de {formatCurrency(b.expected)} previsto
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold capitalize">Cobranças — {monthLabel}</h2>
        <PaymentsTable payments={data.payments} />
      </div>
    </div>
  );
}
