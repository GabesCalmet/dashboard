import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ExpensesTable } from "@/components/financial/expenses-table";
import { ExpenseFormDialog } from "@/components/financial/expense-form-dialog";
import { listExpenses } from "@/server/queries/expenses";

export default async function AdminFinancialGastosPage() {
  const expenses = await listExpenses();

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
        description="Gastos únicos e recorrentes da escola."
        actions={<ExpenseFormDialog />}
      />

      <ExpensesTable
        expenses={expenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          frequency: e.frequency,
          date: e.date,
          dayOfMonth: e.dayOfMonth,
          endDate: e.endDate,
          notes: e.notes,
        }))}
      />
    </div>
  );
}
