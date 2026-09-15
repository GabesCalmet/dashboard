import Link from "next/link";
import { ArrowLeft, Users, Megaphone, Handshake, FlaskConical, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ExpensesTable } from "@/components/financial/expenses-table";
import { ExpenseFormDialog } from "@/components/financial/expense-form-dialog";
import { MonthNav } from "@/components/financial/month-nav";
import { listExpensesForMonth, getExpenseCategoryTotals } from "@/server/queries/expenses";
import { getTeacherPayrollForMonth } from "@/server/queries/teachers";
import { getPartnerSplitForMonth } from "@/server/queries/financial";
import { getPaidTeacherPayrollTotal } from "@/server/queries/payouts";
import { parseMonthParam, monthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

const categoryIcon = {
  PROFESSORES: Users,
  MARKETING: Megaphone,
  PARCEIROS: Handshake,
  RD: FlaskConical,
  OUTROS: MoreHorizontal,
} as const;

export default async function AdminFinancialGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const [expenses, categoryTotals, payroll, paidTeacherTotal, partnerSplit] = await Promise.all([
    listExpensesForMonth(year, month),
    getExpenseCategoryTotals(year, month),
    getTeacherPayrollForMonth(year, month),
    // Realizado for Professores is what's actually been marked paid this
    // month (see the Payout model) — not the live accrual figure, which
    // stays available as "Previsto" and on the per-teacher breakdown page.
    getPaidTeacherPayrollTotal(year, month),
    getPartnerSplitForMonth(year, month),
  ]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const defaultDate = new Date(year, month, 1).toISOString().slice(0, 10);
  const payrollHref = `/admin/financial/gastos/professores?month=${monthParam(year, month)}`;
  const parceirosHref = `/admin/financial/gastos/parceiros?month=${monthParam(year, month)}`;

  // "Professores" isn't a manually-typed expense — it's derived from
  // actual lesson hours × hourly rate (see getTeacherPayrollForMonth), so
  // its box overrides the (always-zero) expense-category total and links
  // to the per-teacher breakdown instead. "Parceiros" is likewise derived
  // — Joe and Gabriel's combined 2/3 share of this month's revenue after
  // teacher pay (see getPartnerSplitForMonth). Both follow whichever month
  // this page is browsing, and Realizado only counts what's been marked
  // paid on the breakdown page, not a live accrual figure.
  const boxes = categoryTotals.map((c) => {
    if (c.category === "PROFESSORES") {
      return { ...c, previsto: payroll.totals.previsto, realizado: paidTeacherTotal, href: payrollHref };
    }
    if (c.category === "PARCEIROS") {
      return {
        ...c,
        previsto: partnerSplit.previsto.partnersTotal,
        realizado: partnerSplit.realizado.partnersTotal,
        href: parceirosHref,
      };
    }
    return {
      ...c,
      href: `/admin/financial/gastos/categoria/${c.category.toLowerCase()}?month=${monthParam(year, month)}`,
    };
  });

  return (
    <div>
      <Link
        href="/admin/financial"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Financeiro
      </Link>

      <PageHeader
        title="Gastos"
        description="Gastos únicos e recorrentes da escola, por mês."
        actions={<ExpenseFormDialog defaultDate={defaultDate} />}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthNav basePath="/admin/financial/gastos" year={year} month={month} />
        <p className="text-sm text-muted-foreground">
          Total do mês: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
        </p>
      </div>

      <h2 className="mb-3 text-sm font-semibold">Previsão de gastos</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {boxes.map((c) => (
          <StatCard
            key={`previsto-${c.category}`}
            label={c.label}
            value={formatCurrency(c.previsto)}
            icon={categoryIcon[c.category]}
            href={c.href}
          />
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold">Gastos reais</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {boxes.map((c) => (
          <StatCard
            key={`realizado-${c.category}`}
            label={c.label}
            value={formatCurrency(c.realizado)}
            icon={categoryIcon[c.category]}
            href={c.href}
            accent
          />
        ))}
      </div>

      <ExpensesTable
        expenses={expenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          frequency: e.frequency,
          category: e.category,
          date: e.date,
          occurrenceDate: e.occurrenceDate,
          dayOfMonth: e.dayOfMonth,
          endDate: e.endDate,
          bankAccount: e.bankAccount,
          notes: e.notes,
        }))}
      />
    </div>
  );
}
