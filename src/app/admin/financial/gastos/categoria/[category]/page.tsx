import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MonthNav } from "@/components/financial/month-nav";
import { ExpensesTable } from "@/components/financial/expenses-table";
import { listExpensesForMonth } from "@/server/queries/expenses";
import { parseMonthParam } from "@/lib/month-param";
import { expenseCategoryLabel, formatCurrency } from "@/lib/labels";
import type { ExpenseCategory } from "@prisma/client";

export default async function AdminExpenseCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { category } = await params;
  const categoryKey = category.toUpperCase() as ExpenseCategory;
  if (!(categoryKey in expenseCategoryLabel)) notFound();

  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const allExpenses = await listExpensesForMonth(year, month);
  const expenses = allExpenses.filter((e) => e.category === categoryKey);
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <Link
        href="/admin/financial/gastos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Gastos
      </Link>

      <PageHeader
        title={expenseCategoryLabel[categoryKey]}
        description={`Todos os gastos cadastrados em "${expenseCategoryLabel[categoryKey]}" no mês.`}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthNav
          basePath={`/admin/financial/gastos/categoria/${category}`}
          year={year}
          month={month}
        />
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
