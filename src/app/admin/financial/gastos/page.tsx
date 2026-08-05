import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ExpensesTable } from "@/components/financial/expenses-table";
import { ExpenseFormDialog } from "@/components/financial/expense-form-dialog";
import { MonthNav } from "@/components/financial/month-nav";
import { listExpensesForMonth } from "@/server/queries/expenses";
import { parseMonthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function AdminFinancialGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const expenses = await listExpensesForMonth(year, month);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const defaultDate = new Date(year, month, 1).toISOString().slice(0, 10);

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

      <ExpensesTable
        expenses={expenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          frequency: e.frequency,
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
