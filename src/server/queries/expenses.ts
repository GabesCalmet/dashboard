import { prisma } from "@/lib/prisma";
import { expenseTotalForMonth } from "@/server/queries/financial";
import { expenseCategoryLabel } from "@/lib/labels";
import type { ExpenseCategory } from "@prisma/client";

export async function listExpenses() {
  return prisma.expense.findMany({ orderBy: { date: "desc" } });
}

// Per-category previsto (whole month's known/expected expenses) vs
// realizado (only what's actually accrued by today) — the 4 boxes shown
// on the Gastos page under each heading.
export async function getExpenseCategoryTotals(year: number, month: number) {
  const now = new Date();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const expenses = await prisma.expense.findMany();

  return (Object.keys(expenseCategoryLabel) as ExpenseCategory[]).map((category) => {
    const categoryExpenses = expenses.filter((e) => e.category === category);
    return {
      category,
      label: expenseCategoryLabel[category],
      previsto: expenseTotalForMonth(categoryExpenses, monthStart, monthEnd),
      realizado: expenseTotalForMonth(categoryExpenses, monthStart, monthEnd, now),
    };
  });
}

// Expenses relevant to a specific month/year: one-time expenses dated
// within it, plus each recurring expense that was active during it (shown
// with that month's own occurrence date, e.g. dayOfMonth clamped to the
// month's real length) — lets past and future months be viewed/backfilled
// individually instead of one flat all-time list.
export async function listExpensesForMonth(year: number, month: number) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const daysInMonth = monthEnd.getDate();

  const expenses = await prisma.expense.findMany();

  return expenses
    .filter((e) => {
      if (e.frequency === "ONE_TIME") return e.date >= monthStart && e.date <= monthEnd;
      return e.date <= monthEnd && (!e.endDate || e.endDate >= monthStart);
    })
    .map((e) => ({
      ...e,
      occurrenceDate:
        e.frequency === "RECURRING"
          ? new Date(year, month, Math.min(e.dayOfMonth ?? 1, daysInMonth))
          : e.date,
    }))
    .sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
}
