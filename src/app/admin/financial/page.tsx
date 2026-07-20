import { Wallet, TrendingUp, AlertTriangle, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashFlowChart } from "@/components/financial/cash-flow-chart";
import { PaymentsTable } from "@/components/financial/payments-table";
import { GenerateBillingButton } from "@/components/financial/generate-billing-button";
import { getFinancialOverview } from "@/server/queries/financial";
import { formatCurrency } from "@/lib/labels";

export default async function AdminFinancialPage() {
  const data = await getFinancialOverview();

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Controle de mensalidades e fluxo de caixa."
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

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Cobranças do mês atual</h2>
        <PaymentsTable payments={data.payments} />
      </div>
    </div>
  );
}
