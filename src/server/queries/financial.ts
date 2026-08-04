import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { bankAccountLabel } from "@/lib/labels";
import { getBillingSlots } from "@/server/billing";
import type { BankAccount, Expense, PaymentStatus } from "@prisma/client";

export async function getFinancialOverview() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const daysInMonth = endOfMonth(monthStart).getDate();

  const [received, activeStudents, payments] = await Promise.all([
    prisma.payment.aggregate({
      where: { referenceMonth: monthStart, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.studentProfile.findMany({
      where: { status: "ACTIVE" },
      include: { user: true },
    }),
    prisma.payment.findMany({
      where: { referenceMonth: monthStart },
      include: { student: { include: { user: true } } },
    }),
  ]);

  const paymentBySlot = new Map(payments.map((p) => [`${p.studentId}::${p.payerName ?? ""}`, p]));

  // Every active student shows up here — one row per billing slot (their
  // own portion, plus a separate one for a third-party payer if
  // configured) — either the real cobrança for this month, or a
  // placeholder (not yet billed) so nobody's missing just because "Gerar
  // cobranças" hasn't been run yet. Marking a placeholder as paid creates
  // the real Payment row on demand.
  const rows = activeStudents
    .flatMap((s) =>
      getBillingSlots(s).map((slot) => {
        const payment = paymentBySlot.get(`${s.id}::${slot.payerName ?? ""}`);
        if (payment) {
          return {
            id: payment.id,
            studentId: s.id,
            studentName: s.user.name,
            payerName: payment.payerName,
            amount: Number(payment.amount),
            dueDate: payment.dueDate,
            status: payment.status,
            bankAccount: slot.bankAccount,
          };
        }
        const dueDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(slot.dueDay, daysInMonth));
        const status: PaymentStatus = dueDate < now ? "LATE" : "PENDING";
        return {
          id: null,
          studentId: s.id,
          studentName: s.user.name,
          payerName: slot.payerName,
          amount: slot.amount,
          dueDate,
          status,
          bankAccount: slot.bankAccount,
        };
      })
    )
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const expectedTotal = rows.reduce((sum, r) => sum + r.amount, 0);
  const receivedTotal = Number(received._sum.amount ?? 0);
  const delinquencyRate =
    expectedTotal > 0 ? ((expectedTotal - receivedTotal) / expectedTotal) * 100 : 0;
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const lateCount = rows.filter((r) => r.status === "LATE").length;

  const byBankAccount = (Object.keys(bankAccountLabel) as BankAccount[]).map((account) => {
    const accountRows = rows.filter((r) => r.bankAccount === account);
    const expectedAcc = accountRows.reduce((sum, r) => sum + r.amount, 0);
    const receivedAcc = accountRows
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.amount, 0);
    return { account, label: bankAccountLabel[account], expected: expectedAcc, received: receivedAcc };
  });

  const cashFlowBuckets = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMM") };
  });

  const cashFlow = await Promise.all(
    cashFlowBuckets.map(async (b) => {
      const paid = await prisma.payment.aggregate({
        where: { referenceMonth: b.start, status: "PAID" },
        _sum: { amount: true },
      });
      const total = await prisma.payment.aggregate({
        where: { referenceMonth: b.start },
        _sum: { amount: true },
      });
      return {
        month: b.label,
        recebido: Number(paid._sum.amount ?? 0),
        previsto: Number(total._sum.amount ?? 0),
      };
    })
  );

  return {
    monthlyRevenueExpected: expectedTotal,
    monthlyRevenueReceived: receivedTotal,
    pendingCount,
    lateCount,
    delinquencyRate,
    // Already plain numbers/primitives (not Prisma Decimal instances), so
    // safe to hand straight to the client-side PaymentsTable.
    payments: rows,
    cashFlow,
    byBankAccount,
  };
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function recurringActiveInMonth(e: Expense, monthStart: Date, monthEnd: Date) {
  return e.date <= monthEnd && (!e.endDate || e.endDate >= monthStart);
}

// Sums expenses that fall within [monthStart, monthEnd]. If `cutoff` is
// given, only counts an expense once its effective day in that month has
// actually arrived (used for "realizado" vs "previsto" — previsto omits
// the cutoff and counts the whole month's known/expected expenses).
function expenseTotalForMonth(expenses: Expense[], monthStart: Date, monthEnd: Date, cutoff?: Date) {
  return expenses.reduce((sum, e) => {
    if (e.frequency === "ONE_TIME") {
      if (e.date < monthStart || e.date > monthEnd) return sum;
      if (cutoff && e.date > cutoff) return sum;
      return sum + Number(e.amount);
    }
    if (!recurringActiveInMonth(e, monthStart, monthEnd)) return sum;
    if (cutoff) {
      const day = Math.min(e.dayOfMonth ?? 1, daysInMonth(monthStart));
      const effectiveDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (effectiveDate > cutoff) return sum;
    }
    return sum + Number(e.amount);
  }, 0);
}

// Overview for the main /admin/financial dashboard: realized vs. previsto
// for the current month (receita/gasto/caixa), the teacher férias
// provision, year-to-date totals, a monthly chart for the year, and the
// active student count.
export async function getFinancialSummary() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [receivedAgg, activeStudentsAgg, totalContributors, expenses, activeTeachers] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { referenceMonth: monthStart, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.studentProfile.aggregate({
        where: { status: "ACTIVE" },
        _sum: { monthlyValue: true },
      }),
      prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
      prisma.expense.findMany(),
      prisma.teacherProfile.findMany({ where: { user: { active: true } } }),
    ]);

  const revenueRealized = Number(receivedAgg._sum.amount ?? 0);
  const revenuePrevisto = Number(activeStudentsAgg._sum.monthlyValue ?? 0);
  const expenseRealized = expenseTotalForMonth(expenses, monthStart, monthEnd, now);
  const expensePrevisto = expenseTotalForMonth(expenses, monthStart, monthEnd);

  // Provisão mensal de férias dos professores: 8,3% do valor que cada
  // professor recebe no mês (valor/hora × horas mensais), acumulada mês a
  // mês desde janeiro com o quadro atual de professores.
  const feriasMonthly = activeTeachers.reduce((sum, t) => {
    const monthlyPay = Number(t.hourlyRate) * t.weeklyHours;
    return sum + monthlyPay * 0.083;
  }, 0);
  const monthsElapsed = now.getMonth() + 1;
  const feriasAnnual = feriasMonthly * monthsElapsed;

  const monthsInYear = Array.from({ length: now.getMonth() + 1 }, (_, m) => {
    const mStart = new Date(now.getFullYear(), m, 1);
    return { start: mStart, end: endOfMonth(mStart) };
  });

  const monthlyReceitas = await Promise.all(
    monthsInYear.map((mo) =>
      prisma.payment.aggregate({
        where: { status: "PAID", referenceMonth: mo.start },
        _sum: { amount: true },
      })
    )
  );

  const yearlyChart = monthsInYear.map((mo, i) => {
    const receita = Number(monthlyReceitas[i]._sum.amount ?? 0);
    const gasto = expenseTotalForMonth(expenses, mo.start, mo.end);
    return { month: format(mo.start, "MMM"), receita, gasto, lucro: receita - gasto };
  });

  const ytdGrossRevenue = yearlyChart.reduce((sum, m) => sum + m.receita, 0);
  const ytdExpenses = yearlyChart.reduce((sum, m) => sum + m.gasto, 0);

  return {
    revenueRealized,
    revenuePrevisto,
    expenseRealized,
    expensePrevisto,
    caixaRealized: revenueRealized - expenseRealized,
    caixaPrevisto: revenuePrevisto - expensePrevisto,
    feriasMonthly,
    feriasAnnual,
    ytdGrossRevenue,
    ytdExpenses,
    ytdProfit: ytdGrossRevenue - ytdExpenses,
    yearlyChart,
    totalContributors,
  };
}
