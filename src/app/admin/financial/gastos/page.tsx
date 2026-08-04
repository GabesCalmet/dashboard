import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ExpensesTable } from "@/components/financial/expenses-table";
import { ExpenseFormDialog } from "@/components/financial/expense-form-dialog";
import { listExpensesForMonth } from "@/server/queries/expenses";
import { formatCurrency } from "@/lib/labels";

function parseMonthParam(month?: string) {
  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (y && m && m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthParam(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default async function AdminFinancialGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const expenses = await listExpensesForMonth(year, month);

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/financial/gastos?month=${monthParam(prev.getFullYear(), prev.getMonth())}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-40 text-center text-sm font-medium capitalize">{label}</span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/financial/gastos?month=${monthParam(next.getFullYear(), next.getMonth())}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
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
          notes: e.notes,
        }))}
      />
    </div>
  );
}
