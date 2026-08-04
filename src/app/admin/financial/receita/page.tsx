import Link from "next/link";
import { ArrowLeft, Wallet, TrendingUp, AlertTriangle, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashFlowChart } from "@/components/financial/cash-flow-chart";
import { PaymentsTable } from "@/components/financial/payments-table";
import { GenerateBillingButton } from "@/components/financial/generate-billing-button";
import { getFinancialOverview } from "@/server/queries/financial";
import { formatCurrency } from "@/lib/labels";

export default async function AdminFinancialReceitaPage() {
  const data = await getFinancialOverview();

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
        actions={<GenerateBillingButton />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Receita prevista (mês)"
          value={formatCurrency(data.monthlyRevenueExpected)}
          icon={Wallet}
        />
        <StatCard
          label="Receita recebida (mês)"
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
          <CardTitle>Fluxo de caixa — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={data.cashFlow} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Receita por conta bancária (mês atual)</CardTitle>
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
        <h2 className="mb-3 text-sm font-semibold">Cobranças do mês atual</h2>
        <PaymentsTable payments={data.payments} />
      </div>
    </div>
  );
}
