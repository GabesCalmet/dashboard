import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { bankAccountLabel } from "@/lib/labels";
import { getBillingSlots, withBillingGroupMembers } from "@/server/billing";
import { getTeacherPayrollForMonth } from "@/server/queries/teachers";
import type { BankAccount, Expense, PaymentStatus } from "@prisma/client";

export async function getFinancialOverview(year?: number, month?: number) {
  const now = new Date();
  const viewedMonth = year !== undefined && month !== undefined ? new Date(year, month, 1) : now;
  const monthStart = startOfMonth(viewedMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = monthEnd.getDate();

  const [received, activeStudents, payments] = await Promise.all([
    prisma.payment.aggregate({
      where: { referenceMonth: monthStart, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.studentProfile.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: true,
        teacher: { include: { user: true } },
        groupMembers: { include: { user: true } },
      },
    }),
    prisma.payment.findMany({
      where: { referenceMonth: monthStart },
      include: { student: { include: { user: true } } },
    }),
  ]);

  const paymentBySlot = new Map(payments.map((p) => [`${p.studentId}::${p.payerName ?? ""}`, p]));
  const studentIdsWithPayment = new Set(payments.map((p) => p.studentId));

  // Every active student billable by this month shows up here — one row
  // per billing slot (their own portion, plus a separate one for a
  // third-party payer if configured) — either the real cobrança for this
  // month, or a placeholder (not yet billed) so nobody's missing just
  // because "Gerar cobranças" hasn't been run yet. billingStartDate (when
  // set) governs this independently of startDate — classes and billing
  // don't have to start the same month. Students not yet billable don't
  // get placeholders for months before that, even though "active" — a
  // real Payment row (if one somehow exists) is never hidden, only the
  // synthesized placeholder is skipped.
  const rows = activeStudents
    .filter((s) => (s.billingStartDate ?? s.startDate) <= monthEnd || studentIdsWithPayment.has(s.id))
    .flatMap((s) =>
      getBillingSlots(withBillingGroupMembers(s), monthStart).map((slot) => {
        const payment = paymentBySlot.get(`${s.id}::${slot.payerName ?? ""}`);
        if (payment) {
          return {
            id: payment.id,
            studentId: s.id,
            studentName: s.user.name,
            teacherName: s.teacher?.user.name ?? null,
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
          teacherName: s.teacher?.user.name ?? null,
          payerName: slot.payerName,
          amount: slot.amount,
          dueDate,
          status,
          bankAccount: slot.bankAccount,
        };
      })
    )
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // A paused row means nothing is owed for that month — it never counts
  // toward what's "expected", so it can't inflate inadimplência either.
  const billableRows = rows.filter((r) => r.status !== "PAUSED");
  const expectedTotal = billableRows.reduce((sum, r) => sum + r.amount, 0);
  const receivedTotal = Number(received._sum.amount ?? 0);
  const delinquencyRate =
    expectedTotal > 0 ? ((expectedTotal - receivedTotal) / expectedTotal) * 100 : 0;
  const paidCount = rows.filter((r) => r.status === "PAID").length;
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const lateCount = rows.filter((r) => r.status === "LATE").length;
  const pausedCount = rows.filter((r) => r.status === "PAUSED").length;

  const byBankAccount = (Object.keys(bankAccountLabel) as BankAccount[]).map((account) => {
    const accountRows = rows.filter((r) => r.bankAccount === account && r.status !== "PAUSED");
    const expectedAcc = accountRows.reduce((sum, r) => sum + r.amount, 0);
    const receivedAcc = accountRows
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.amount, 0);
    return { account, label: bankAccountLabel[account], expected: expectedAcc, received: receivedAcc };
  });

  const cashFlowBuckets = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(viewedMonth, 5 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMM") };
  });

  const cashFlow = await Promise.all(
    cashFlowBuckets.map(async (b) => {
      const paid = await prisma.payment.aggregate({
        where: { referenceMonth: b.start, status: "PAID" },
        _sum: { amount: true },
      });
      const total = await prisma.payment.aggregate({
        where: { referenceMonth: b.start, status: { not: "PAUSED" } },
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
    paidCount,
    pendingCount,
    lateCount,
    pausedCount,
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
export function expenseTotalForMonth(expenses: Expense[], monthStart: Date, monthEnd: Date, cutoff?: Date) {
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

// How much of a recurring/one-time expense has actually accrued by `now`
// since it started — used for all-time balances, not just one month.
function expenseTotalToDate(e: Expense, now: Date) {
  if (e.frequency === "ONE_TIME") {
    return e.date <= now ? Number(e.amount) : 0;
  }
  if (e.date > now) return 0;
  const end = e.endDate && e.endDate < now ? e.endDate : now;
  const months =
    (end.getFullYear() - e.date.getFullYear()) * 12 + (end.getMonth() - e.date.getMonth()) + 1;
  return Math.max(0, months) * Number(e.amount);
}

// Running balance per bank account: everything ever received into it
// (paid cobranças) minus everything ever spent from it (gastos, accrued
// to date) — "how much is actually in the account right now".
export async function getBankBalances() {
  const now = new Date();

  const [paidPayments, expenses] = await Promise.all([
    prisma.payment.findMany({ where: { status: "PAID" }, include: { student: true } }),
    prisma.expense.findMany(),
  ]);

  const received: Record<BankAccount, number> = { GABES: 0, JOE: 0, ASAAS: 0 };
  for (const p of paidPayments) {
    const account = p.payerName
      ? (p.student.thirdPartyBankAccount ?? p.student.bankAccount)
      : p.student.bankAccount;
    received[account] += Number(p.amount);
  }

  const spent: Record<BankAccount, number> = { GABES: 0, JOE: 0, ASAAS: 0 };
  for (const e of expenses) {
    spent[e.bankAccount] += expenseTotalToDate(e, now);
  }

  return (Object.keys(bankAccountLabel) as BankAccount[]).map((account) => ({
    account,
    label: bankAccountLabel[account],
    received: received[account],
    spent: spent[account],
    balance: received[account] - spent[account],
  }));
}

// Overview for the main /admin/financial dashboard: realized vs. previsto
// for the current month (receita/gasto/caixa), the teacher férias
// provision, year-to-date totals, a monthly chart for the year, and the
// active student count.
export async function getFinancialSummary() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [receivedAgg, activeStudentsForRevenue, totalContributors, expenses, teacherPayroll] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { referenceMonth: monthStart, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.studentProfile.findMany({
        where: { status: "ACTIVE" },
        select: { monthlyValue: true, thirdPartyAmount: true, groupMembers: { select: { monthlyValue: true } } },
      }),
      prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
      prisma.expense.findMany(),
      // What teachers actually earned this month (OK/NC/R hours × whatever
      // each is paid per student/group) — the basis for férias below, same
      // "Realizado" figure shown on the Professores box.
      getTeacherPayrollForMonth(now.getFullYear(), now.getMonth()),
    ]);

  const revenueRealized = Number(receivedAgg._sum.amount ?? 0);
  // The course's real monthly total is the student's own portion plus
  // whatever a third party covers on top of it, plus every group
  // participant's own separate share (see getBillingSlots).
  const revenuePrevisto = activeStudentsForRevenue.reduce(
    (sum, s) =>
      sum +
      Number(s.monthlyValue) +
      Number(s.thirdPartyAmount ?? 0) +
      s.groupMembers.reduce((memberSum, m) => memberSum + Number(m.monthlyValue), 0),
    0
  );
  const expenseRealized = expenseTotalForMonth(expenses, monthStart, monthEnd, now);
  const expensePrevisto = expenseTotalForMonth(expenses, monthStart, monthEnd);

  // Provisão mensal de férias dos professores: 8,3% do valor que cada
  // professor recebeu no mês (realizado — hours × whatever each is paid
  // per student/group that month), acumulada mês a mês desde janeiro com o
  // quadro atual de professores.
  const feriasMonthly = teacherPayroll.totals.realizado * 0.083;
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

// Full billing picture for one student's own Financeiro tab — every real
// generated Payment plus a live placeholder (same rule the Cobranças table
// uses) for any month since they became billable that hasn't been
// generated yet, so the tab doesn't only show whichever months an admin
// happened to click "Gerar cobranças" for. Billing starts from
// billingStartDate when set — independent of startDate, since classes and
// billing don't have to start the same month. Placeholders stop once the
// student isn't ACTIVE (nothing new is expected), but real past rows for a
// since-paused/canceled student are always included regardless.
export async function getStudentPaymentHistory(studentId: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: { groupMembers: { include: { user: true } } },
  });
  const billingStudent = withBillingGroupMembers(student);
  const realPayments = await prisma.payment.findMany({ where: { studentId } });
  const paymentBySlot = new Map(
    realPayments.map((p) => [`${p.referenceMonth.toISOString().slice(0, 7)}::${p.payerName ?? ""}`, p])
  );

  const now = new Date();
  const billingStart = student.billingStartDate ?? student.startDate;
  const cursor = new Date(billingStart.getFullYear(), billingStart.getMonth(), 1);
  const end = new Date(now.getFullYear() + 1, 11, 1);

  const rows: {
    id: string | null;
    payerName: string | null;
    amount: number;
    referenceMonth: Date;
    dueDate: Date;
    paidAt: Date | null;
    status: PaymentStatus;
    bankAccount: BankAccount;
  }[] = [];

  while (cursor <= end) {
    const monthKey = cursor.toISOString().slice(0, 7);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

    for (const slot of getBillingSlots(billingStudent, cursor)) {
      const real = paymentBySlot.get(`${monthKey}::${slot.payerName ?? ""}`);
      if (real) {
        rows.push({
          id: real.id,
          payerName: real.payerName,
          amount: Number(real.amount),
          referenceMonth: real.referenceMonth,
          dueDate: real.dueDate,
          paidAt: real.paidAt,
          status: real.status,
          bankAccount: slot.bankAccount,
        });
      } else if (student.status === "ACTIVE") {
        const dueDate = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(slot.dueDay, daysInMonth));
        rows.push({
          id: null,
          payerName: slot.payerName,
          amount: slot.amount,
          referenceMonth: new Date(cursor),
          dueDate,
          paidAt: null,
          status: dueDate < now ? "LATE" : "PENDING",
          bankAccount: slot.bankAccount,
        });
      }
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return rows.sort((a, b) => b.referenceMonth.getTime() - a.referenceMonth.getTime());
}

// Every real cobrança currently marked LATE, across every student and
// month — the "you need to chase these down" list, as opposed to the
// Receita page's Cobranças table which only ever shows one month at a
// time. Kept up to date by the daily mark-late-payments cron (see
// /api/cron/mark-late-payments) plus whatever's set by hand.
export async function getLatePayments() {
  const payments = await prisma.payment.findMany({
    where: { status: "LATE" },
    include: { student: { include: { user: true, teacher: { include: { user: true } } } } },
    orderBy: { dueDate: "asc" },
  });

  return payments.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    studentName: p.student.user.name,
    teacherName: p.student.teacher?.user.name ?? null,
    payerName: p.payerName,
    amount: Number(p.amount),
    dueDate: p.dueDate,
    referenceMonth: p.referenceMonth,
    // Not stored per-payment — resolved the same way getBillingSlots does:
    // the third party's own account for their slot, the student's
    // otherwise.
    bankAccount:
      p.payerName && p.payerName === p.student.thirdPartyPayerName
        ? (p.student.thirdPartyBankAccount ?? p.student.bankAccount)
        : p.student.bankAccount,
  }));
}
