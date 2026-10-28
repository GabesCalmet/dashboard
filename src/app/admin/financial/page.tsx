import Link from "next/link";
import { endOfMonth } from "date-fns";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ReceiptText,
  Landmark,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MonthNav } from "@/components/financial/month-nav";
import { MigrateChargesButton } from "@/components/financial/migrate-charges-button";
import { BankAccountCard } from "@/components/financial/bank-account-card";
import { YearlyGrowthChart } from "@/components/financial/yearly-growth-chart";
import { getFinancialSummary, getBankBalances } from "@/server/queries/financial";
import { getExpenseCategoryTotals } from "@/server/queries/expenses";
import { parseMonthParam, monthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";
import { cn } from "@/lib/utils";

export default async function AdminFinancialPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const monthQuery = monthParam(year, month);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const [data, bankBalances, categoryTotals] = await Promise.all([
    getFinancialSummary(year, month),
    getBankBalances(endOfMonth(new Date(year, month, 1))),
    getExpenseCategoryTotals(year, month),
  ]);
  // Professores/Parceiros are derived elsewhere (teacher payroll, partner
  // split) rather than manually-typed Expense rows — only these three
  // categories belong in the Resumo breakdown below.
  const manualCategories = categoryTotals.filter(
    (c) => c.category === "MARKETING" || c.category === "RD" || c.category === "OUTROS"
  );
  // "Lucro final" is what's actually left for the school after its own
  // running costs (Marketing/R&D/Outros/Férias) come out of its own 1/3
  // share — "Para a escola" by itself still overstates it, since those
  // costs aren't paid by the partners' shares.
  const manualTotalRealizado = manualCategories.reduce((sum, c) => sum + c.realizado, 0);
  const manualTotalPrevisto = manualCategories.reduce((sum, c) => sum + c.previsto, 0);
  const lucroFinalRealizado =
    data.partnerSplit.realizado.school - manualTotalRealizado - data.feriasMonthlyRealizado;
  const lucroFinalPrevisto =
    data.partnerSplit.previsto.school - manualTotalPrevisto - data.feriasMonthlyPrevisto;

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Visão geral de receita, gastos e caixa da escola."
        actions={<MigrateChargesButton />}
      />

      {/* Not affected by the month switcher below — just links to the
          Receita/Gastos pages, which browse their own months independently.
          The whole card is the tap target (not just the button inside it) —
          easier to hit on mobile. The "Abrir X" pill stays purely visual
          (a styled div, not its own link/button) since nesting it inside
          another link would be invalid HTML. Always side by side (even on
          phones) and compact, so both fit without needing to scroll past
          one to reach the other. */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link href="/admin/financial/receita" className="block">
          <Card className="h-full transition-colors hover:border-accent hover:bg-accent/5">
            <CardHeader className="gap-0.5 px-3 py-3">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <TrendingUp className="size-4 shrink-0 text-accent" /> Receita
              </CardTitle>
              <CardDescription className="text-xs">
                Mensalidades, cobranças e fluxo de caixa recebido.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/financial/gastos" className="block">
          <Card className="h-full transition-colors hover:border-accent hover:bg-accent/5">
            <CardHeader className="gap-0.5 px-3 py-3">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <ReceiptText className="size-4 shrink-0 text-destructive" /> Gastos
              </CardTitle>
              <CardDescription className="text-xs">Gastos únicos e recorrentes da escola.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="mb-4">
        <MonthNav basePath="/admin/financial" year={year} month={month} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Receita bruta (ano)"
          value={formatCurrency(data.ytdGrossRevenue)}
          icon={Wallet}
          trend={{ value: String(year) }}
        />
        <StatCard
          label="Gastos (ano)"
          value={formatCurrency(data.ytdExpenses)}
          icon={TrendingDown}
          trend={{ value: String(year) }}
        />
        <StatCard
          label="Lucro (ano)"
          value={formatCurrency(data.ytdProfit)}
          icon={Landmark}
          accent
          trend={{ value: String(year) }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">Resumo de {monthLabel}</CardTitle>
          <CardDescription>
            {isCurrentMonth ? "Realizado até hoje" : "Realizado no mês"} e previsto para o mês inteiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Realizado
              </p>
              <div className="space-y-3">
                <SummaryRow label="Receita recebida" value={data.revenueRealized} tone="accent" />
                <SummaryRow
                  label="Professores"
                  value={data.teacherPayrollRealizado}
                  tone="destructive"
                  href={`/admin/financial/gastos/professores?month=${monthQuery}`}
                />
                <SummaryRow label="Parceiros — Joe" value={data.partnerSplit.realizado.joe} tone="strong" />
                <SummaryRow
                  label="Parceiros — Gabriel"
                  value={data.partnerSplit.realizado.gabriel}
                  tone="strong"
                />
                <SummaryRow label="Para a escola" value={data.partnerSplit.realizado.school} tone="strong" />
                {manualCategories.map((c) => (
                  <SummaryRow
                    key={c.category}
                    label={c.label}
                    value={c.realizado}
                    tone="destructive"
                    href={`/admin/financial/gastos/categoria/${c.category.toLowerCase()}?month=${monthQuery}`}
                  />
                ))}
                <SummaryRow
                  label="Férias"
                  value={data.feriasMonthlyRealizado}
                  tone="destructive"
                  href={`/admin/financial/ferias?month=${monthQuery}`}
                />
                <SummaryRow label="Lucro final" value={lucroFinalRealizado} tone="accent" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Previsto (mês)
              </p>
              <div className="space-y-3">
                <SummaryRow label="Receita prevista" value={data.revenuePrevisto} tone="accent" />
                <SummaryRow
                  label="Professores"
                  value={data.teacherPayrollPrevisto}
                  tone="destructive"
                  href={`/admin/financial/gastos/professores?month=${monthQuery}`}
                />
                <SummaryRow label="Parceiros — Joe" value={data.partnerSplit.previsto.joe} tone="strong" />
                <SummaryRow
                  label="Parceiros — Gabriel"
                  value={data.partnerSplit.previsto.gabriel}
                  tone="strong"
                />
                <SummaryRow label="Para a escola" value={data.partnerSplit.previsto.school} tone="strong" />
                {manualCategories.map((c) => (
                  <SummaryRow
                    key={c.category}
                    label={c.label}
                    value={c.previsto}
                    tone="destructive"
                    href={`/admin/financial/gastos/categoria/${c.category.toLowerCase()}?month=${monthQuery}`}
                  />
                ))}
                <SummaryRow
                  label="Férias"
                  value={data.feriasMonthlyPrevisto}
                  tone="destructive"
                  href={`/admin/financial/ferias?month=${monthQuery}`}
                />
                <SummaryRow label="Lucro final" value={lucroFinalPrevisto} tone="accent" />
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
          href={`/admin/financial/ferias?month=${monthQuery}`}
        />
        <StatCard
          label="Mensal — atual"
          value={formatCurrency(data.feriasMonthlyRealizado)}
          icon={PiggyBank}
          accent
          href={`/admin/financial/ferias?month=${monthQuery}`}
        />
        <StatCard
          label="Anual — previsto"
          value={formatCurrency(data.feriasAnnualPrevisto)}
          icon={PiggyBank}
          href={`/admin/financial/ferias?month=${monthQuery}`}
        />
        <StatCard
          label="Anual — atual"
          value={formatCurrency(data.feriasAnnualRealizado)}
          icon={PiggyBank}
          accent
          href={`/admin/financial/ferias?month=${monthQuery}`}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="capitalize">Saldo por conta bancária — até {monthLabel}</CardTitle>
          <CardDescription>Total recebido menos total gasto em cada conta, desde o início.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {bankBalances.map((b) => (
              <BankAccountCard
                key={b.account}
                label={b.label}
                balance={b.balance}
                received={b.received}
                spent={b.spent}
                receivedItems={b.receivedItems}
                spentItems={b.spentItems}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Receita x gasto x lucro — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <YearlyGrowthChart data={data.yearlyChart} />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: "accent" | "destructive" | "strong";
  // When set, the value links to that category/teacher's own detail page
  // for this exact same month (not just a generic link to the section) —
  // e.g. "Professores" goes straight to Gastos > Professores already
  // filtered to the month this Resumo card is showing.
  href?: string;
}) {
  const valueClassName =
    tone === "accent"
      ? "font-semibold text-success"
      : tone === "destructive"
        ? "font-semibold text-destructive"
        : "text-base font-semibold";

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {href ? (
        <Link href={href} className={cn(valueClassName, "hover:underline")}>
          {formatCurrency(value)}
        </Link>
      ) : (
        <span className={valueClassName}>{formatCurrency(value)}</span>
      )}
    </div>
  );
}
