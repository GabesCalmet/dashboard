import { prisma } from "@/lib/prisma";
import { brazilToday } from "@/lib/timezone";
import { expenseTotalForMonth, expenseRealizedForMonth } from "@/server/queries/financial";
import { expenseCategoryLabel } from "@/lib/labels";
import type { ExpenseCategory, PaymentStatus } from "@prisma/client";

export async function listExpenses() {
  return prisma.expense.findMany({ orderBy: { date: "desc" } });
}

// Per-category previsto (whole month's known/expected expenses) vs
// realizado (only what's been explicitly confirmed Pago for this month —
// see expenseRealizedForMonth) — the boxes shown on the Gastos page under
// each heading.
export async function getExpenseCategoryTotals(year: number, month: number) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const [expenses, occurrences] = await Promise.all([
    prisma.expense.findMany(),
    prisma.expenseOccurrence.findMany({
      where: { referenceMonth: monthStart },
      select: { expenseId: true, status: true, amountOverride: true },
    }),
  ]);
  const paidExpenseIds = new Set(occurrences.filter((o) => o.status === "PAID").map((o) => o.expenseId));
  const amountOverrides = new Map(
    occurrences.filter((o) => o.amountOverride != null).map((o) => [o.expenseId, Number(o.amountOverride)])
  );

  return (Object.keys(expenseCategoryLabel) as ExpenseCategory[]).map((category) => {
    const categoryExpenses = expenses.filter((e) => e.category === category);
    return {
      category,
      label: expenseCategoryLabel[category],
      previsto: expenseTotalForMonth(categoryExpenses, monthStart, monthEnd, amountOverrides),
      realizado: expenseRealizedForMonth(
        categoryExpenses,
        paidExpenseIds,
        monthStart,
        monthEnd,
        amountOverrides
      ),
    };
  });
}

// A month with no real ExpenseOccurrence row yet is "not confirmed" —
// shown as Atrasado/Pendente live depending on whether its effective date
// has already passed, same convention as an un-generated Payment
// placeholder, never stored until someone actually acts on it.
function defaultOccurrenceStatus(effectiveDate: Date, now: Date): PaymentStatus {
  return effectiveDate < now ? "LATE" : "PENDING";
}

// Expenses relevant to a specific month/year: one-time expenses dated
// within it, plus each recurring expense that was active during it (shown
// with that month's own occurrence date, e.g. dayOfMonth clamped to the
// month's real length) — lets past and future months be viewed/backfilled
// individually instead of one flat all-time list. Each row carries its own
// occurrence status/paidAt for that month (see ExpenseOccurrence) so
// payment can be confirmed per month instead of for the whole recurring
// series at once.
export async function listExpensesForMonth(year: number, month: number) {
  const now = brazilToday();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const daysInMonth = monthEnd.getDate();

  const [expenses, occurrences] = await Promise.all([
    prisma.expense.findMany(),
    prisma.expenseOccurrence.findMany({ where: { referenceMonth: monthStart } }),
  ]);
  const occurrenceByExpenseId = new Map(occurrences.map((o) => [o.expenseId, o]));

  return expenses
    .filter((e) => {
      if (e.frequency === "ONE_TIME") return e.date >= monthStart && e.date <= monthEnd;
      return e.date <= monthEnd && (!e.endDate || e.endDate >= monthStart);
    })
    .map((e) => {
      const occurrenceDate =
        e.frequency === "RECURRING"
          ? new Date(year, month, Math.min(e.dayOfMonth ?? 1, daysInMonth))
          : e.date;
      const occurrence = occurrenceByExpenseId.get(e.id);
      const amountOverride = occurrence?.amountOverride != null ? Number(occurrence.amountOverride) : null;
      return {
        ...e,
        occurrenceDate,
        occurrenceStatus: occurrence?.status ?? defaultOccurrenceStatus(occurrenceDate, now),
        occurrencePaidAt: occurrence?.paidAt ?? null,
        // The amount actually charged THIS month — the override when one's
        // set, otherwise the expense's normal flat amount. Editing the
        // expense itself still changes every month of a recurring series;
        // this is only ever this one month's exception.
        effectiveAmount: amountOverride ?? Number(e.amount),
        amountOverride,
        amountOverrideNote: occurrence?.amountOverrideNote ?? null,
        // Which account this month's bill actually came out of — the
        // override when one's set, otherwise the expense's own default.
        effectiveBankAccount: occurrence?.bankAccountOverride ?? e.bankAccount,
        bankAccountOverride: occurrence?.bankAccountOverride ?? null,
      };
    })
    .sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
}
