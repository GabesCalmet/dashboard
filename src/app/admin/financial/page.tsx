import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Users,
  ArrowRight,
  ReceiptText,
  Landmark,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { YearlyGrowthChart } from "@/components/financial/yearly-growth-chart";
import { getFinancialSummary, getBankBalances } from "@/server/queries/financial";
import { formatCurrency } from "@/lib/labels";

export default async function AdminFinancialPage() {
  const [data, bankBalances] = await Promise.all([getFinancialSummary(), getBankBalances()]);

  return (
    <div>
      <PageHeader title="Financeiro" description="Visão geral de receita, gastos e caixa da escola." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Receita bruta (ano)" value={formatCurrency(data.ytdGrossRevenue)} icon={Wallet} />
        <StatCard label="Gastos (ano)" value={formatCurrency(data.ytdExpenses)} icon={TrendingDown} />
        <StatCard
          label="Lucro (ano)"
          value={formatCurrency(data.ytdProfit)}
          icon={Landmark}
          accent
        />
      </div>

      <div className="mt-6 mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4.5 text-accent" /> Receita
            </CardTitle>
            <CardDescription>Mensalidades, cobranças e fluxo de caixa recebido.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/financial/receita">
                Abrir Receita <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4.5 text-destructive" /> Gastos
            </CardTitle>
            <CardDescription>Gastos únicos e recorrentes da escola.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/financial/gastos">
                Abrir Gastos <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo do mês atual</CardTitle>
          <CardDescription>Realizado até hoje e previsto para o mês inteiro.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Realizado
              </p>
              <div className="space-y-3">
                <SummaryRow label="Receita recebida" value={data.revenueRealized} tone="accent" />
                <SummaryRow label="Gasto efetuado" value={data.expenseRealized} tone="destructive" />
                <SummaryRow label="Em caixa" value={data.caixaRealized} tone="strong" />
                <SummaryRow label="Para a escola" value={data.partnerSplit.realizado.school} tone="strong" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Previsto (mês)
              </p>
              <div className="space-y-3">
                <SummaryRow label="Receita prevista" value={data.revenuePrevisto} tone="accent" />
                <SummaryRow label="Gasto previsto" value={data.expensePrevisto} tone="destructive" />
                <SummaryRow label="Caixa previsto" value={data.caixaPrevisto} tone="strong" />
                <SummaryRow label="Para a escola" value={data.partnerSplit.previsto.school} tone="strong" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="mt-6 mb-3 text-sm font-semibold">Férias (provisão)</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mensal — previsto"
          value={formatCurrency(data.feriasMonthlyPrevisto)}
          icon={PiggyBank}
          href="/admin/financial/ferias"
        />
        <StatCard
          label="Mensal — realizado"
          value={formatCurrency(data.feriasMonthlyRealizado)}
          icon={PiggyBank}
          accent
          href="/admin/financial/ferias"
        />
        <StatCard
          label="Anual — previsto"
          value={formatCurrency(data.feriasAnnualPrevisto)}
          icon={PiggyBank}
          href="/admin/financial/ferias"
        />
        <StatCard
          label="Anual — realizado"
          value={formatCurrency(data.feriasAnnualRealizado)}
          icon={PiggyBank}
          accent
          href="/admin/financial/ferias"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Saldo por conta bancária</CardTitle>
          <CardDescription>Total recebido menos total gasto em cada conta, desde o início.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {bankBalances.map((b) => (
              <div key={b.account} className="rounded-lg border p-4">
                <p className="text-sm font-medium">{b.label}</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(b.balance)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(b.received)} recebido − {formatCurrency(b.spent)} gasto
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Receita x gasto x lucro — ao longo do ano</CardTitle>
        </CardHeader>
        <CardContent>
          <YearlyGrowthChart data={data.yearlyChart} />
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total de contribuintes ativos" value={String(data.totalContributors)} icon={Users} />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "accent" | "destructive" | "strong";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          tone === "accent"
            ? "font-semibold text-success"
            : tone === "destructive"
              ? "font-semibold text-destructive"
              : "text-base font-semibold"
        }
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}
