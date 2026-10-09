import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { bankAccountLabel } from "@/lib/labels";
import {
  getBillingSlots,
  withBillingGroupMembers,
  resolveSlotStudentName,
  isSlotBillableForMonth,
} from "@/server/billing";
import { getTeacherPayrollForMonth, getTeacherFeriasForYear } from "@/server/queries/teachers";
import { getPaidTeacherPayrollTotal, getPartnerPayoutAmount } from "@/server/queries/payouts";
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
  // don't have to start the same month. A slot is only billable once its
  // own resolved due date actually falls on/after billingStartDate
  // (isSlotBillableForMonth), not just "sometime in the same month" — that
  // distinction matters whenever billingStartDate lands after a slot's
  // dueDay within that month. A real Payment row (if one somehow exists)
  // is never hidden, only the synthesized placeholder is skipped.
  const rows = activeStudents
    .filter((s) => (s.billingStartDate ?? s.startDate) <= monthEnd || studentIdsWithPayment.has(s.id))
    .flatMap((s) => {
      const billingStart = s.billingStartDate ?? s.startDate;
      return getBillingSlots(withBillingGroupMembers(s), monthStart)
        .filter(
          (slot) =>
            paymentBySlot.has(`${s.id}::${slot.payerName ?? ""}`) ||
            isSlotBillableForMonth(billingStart, monthStart, slot.dueDay)
        )
        .map((slot) => {
          const payment = paymentBySlot.get(`${s.id}::${slot.payerName ?? ""}`);
          if (payment) {
            return {
              id: payment.id,
              studentId: s.id,
              studentName: resolveSlotStudentName(payment.payerName, s),
              teacherName: s.teacher?.user.name ?? null,
              payerName: payment.payerName,
              amount: Number(payment.amount),
              dueDate: payment.dueDate,
              status: payment.status,
              bankAccount: slot.bankAccount,
            };
          }
          const dueDate = new Date(
            monthStart.getFullYear(),
            monthStart.getMonth(),
            Math.min(slot.dueDay, daysInMonth)
          );
          const status: PaymentStatus = dueDate < now ? "LATE" : "PENDING";
          return {
            id: null,
            studentId: s.id,
            studentName: resolveSlotStudentName(slot.payerName, s),
            teacherName: s.teacher?.user.name ?? null,
            payerName: slot.payerName,
            amount: slot.amount,
            dueDate,
            status,
            bankAccount: slot.bankAccount,
          };
        });
    })
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

export type BankLedgerItem = {
  id: string;
  label: string;
  amount: number;
  date: string;
  // Lets the drill-down dialog visually set manual entradas (not tied to
  // any student) apart from real student payments.
  manual?: boolean;
};

// Running balance per bank account: everything received into it (paid
// cobranças + manual entradas) minus everything spent from it (gastos
// accrued, plus every teacher/partner payout), each deducted from
// whichever account it names (Payout.bankAccount) — up to `asOf`
// (defaults to right now), so this can also show "how much was in the
// account as of the end of month X". receivedItems/spentItems carry the
// same totals broken down line by line, newest first, for the "Saldo por
// conta bancária" drill-down dialog.
export async function getBankBalances(asOf?: Date) {
  const nowReal = new Date();
  // A cutoff is only honored if it's actually in the past — otherwise
  // (the current, still-ongoing month) the balance is as of right now.
  const now = asOf && asOf < nowReal ? asOf : nowReal;

  const [paidPayments, expenses, payouts, manualIncomes] = await Promise.all([
    // Counted as of its dueDate, not paidAt — a payment that was really
    // for (say) January but only got marked PAID in the system months
    // later should still show up as January's money, not get pushed to
    // whenever someone happened to click the status dropdown.
    prisma.payment.findMany({
      where: { status: "PAID", dueDate: { lte: now } },
      include: { student: { include: { user: true, groupMembers: { include: { user: true } } } } },
    }),
    prisma.expense.findMany(),
    prisma.payout.findMany({
      where: { paidAt: { lte: now } },
      include: { teacher: { include: { user: true } } },
    }),
    prisma.manualIncome.findMany({ where: { date: { lte: now } } }),
  ]);

  const received: Record<BankAccount, number> = { GABES: 0, JOE: 0, ASAAS: 0 };
  const receivedItems: Record<BankAccount, BankLedgerItem[]> = { GABES: [], JOE: [], ASAAS: [] };
  for (const p of paidPayments) {
    const account = p.payerName
      ? (p.student.thirdPartyBankAccount ?? p.student.bankAccount)
      : p.student.bankAccount;
    const amount = Number(p.amount);
    received[account] += amount;
    receivedItems[account].push({
      id: p.id,
      label: resolveSlotStudentName(p.payerName, p.student),
      amount,
      date: p.dueDate.toISOString(),
    });
  }
  for (const i of manualIncomes) {
    const amount = Number(i.amount);
    received[i.bankAccount] += amount;
    receivedItems[i.bankAccount].push({
      id: i.id,
      label: i.description,
      amount,
      date: i.date.toISOString(),
      manual: true,
    });
  }

  const spent: Record<BankAccount, number> = { GABES: 0, JOE: 0, ASAAS: 0 };
  const spentItems: Record<BankAccount, BankLedgerItem[]> = { GABES: [], JOE: [], ASAAS: [] };
  for (const e of expenses) {
    const amount = expenseTotalToDate(e, now);
    if (amount <= 0) continue;
    spent[e.bankAccount] += amount;
    spentItems[e.bankAccount].push({
      id: e.id,
      label: e.frequency === "RECURRING" ? `${e.description} (recorrente)` : e.description,
      amount,
      date: e.date.toISOString(),
    });
  }
  for (const p of payouts) {
    const amount = Number(p.amount);
    spent[p.bankAccount] += amount;
    spentItems[p.bankAccount].push({
      id: p.id,
      label:
        p.kind === "TEACHER"
          ? `Professor: ${p.teacher?.user.name ?? "—"}`
          : p.kind === "PARTNER_JOE"
            ? "Parceiro: Joe"
            : "Parceiro: Gabriel",
      amount,
      date: p.paidAt.toISOString(),
    });
  }

  return (Object.keys(bankAccountLabel) as BankAccount[]).map((account) => ({
    account,
    label: bankAccountLabel[account],
    received: received[account],
    spent: spent[account],
    balance: received[account] - spent[account],
    receivedItems: receivedItems[account].sort((a, b) => b.date.localeCompare(a.date)),
    spentItems: spentItems[account].sort((a, b) => b.date.localeCompare(a.date)),
  }));
}

// The Parceiros split for one specific month — previsto is always a live
// forecast (this month's revenue minus this month's teacher payroll,
// divided in 3), while realizado.joe/gabriel only reflect whether that
// partner's own payout has actually been marked paid (see the Payout
// model) — 0 until then, and locked to whatever amount was recorded once
// it is. realizado.school stays a live "if the pie were split right now"
// figure since the school's own third is never "paid out" via a button.
// Shared by getFinancialSummary and the Gastos page / Parceiros breakdown
// page — each passes whichever month is being browsed.
export async function getPartnerSplitForMonth(year: number, month: number) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const [receivedAgg, activeStudentsForRevenue, teacherPayroll, paidTeacherTotal, paidJoe, paidGabriel] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { referenceMonth: monthStart, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.studentProfile.findMany({
        where: { status: "ACTIVE" },
        select: {
          monthlyValue: true,
          thirdPartyAmount: true,
          startDate: true,
          billingStartDate: true,
          groupMembers: { select: { monthlyValue: true } },
        },
      }),
      getTeacherPayrollForMonth(year, month),
      getPaidTeacherPayrollTotal(year, month),
      getPartnerPayoutAmount("PARTNER_JOE", year, month),
      getPartnerPayoutAmount("PARTNER_GABRIEL", year, month),
    ]);

  const revenueRealized = Number(receivedAgg._sum.amount ?? 0);
  // Same billing-start guard as getFinancialSummary's revenuePrevisto —
  // otherwise a currently-active student would inflate the Parceiros
  // split's previsto for a month before they'd even enrolled.
  const revenuePrevisto = activeStudentsForRevenue
    .filter((s) => (s.billingStartDate ?? s.startDate) <= monthEnd)
    .reduce(
      (sum, s) =>
        sum +
        Number(s.monthlyValue) +
        Number(s.thirdPartyAmount ?? 0) +
        s.groupMembers.reduce((memberSum, m) => memberSum + Number(m.monthlyValue), 0),
      0
    );

  const schoolSharePrevisto = (revenuePrevisto - teacherPayroll.totals.previsto) / 3;
  const schoolShareRealizado = (revenueRealized - paidTeacherTotal) / 3;

  return {
    previsto: {
      school: schoolSharePrevisto,
      joe: schoolSharePrevisto,
      gabriel: schoolSharePrevisto,
      partnersTotal: schoolSharePrevisto * 2,
    },
    realizado: {
      school: schoolShareRealizado,
      joe: paidJoe,
      gabriel: paidGabriel,
      partnersTotal: paidJoe + paidGabriel,
    },
  };
}

// Overview for the main /admin/financial dashboard: realized vs. previsto
// for the viewed month (receita/gasto/caixa), the teacher férias
// provision, year-to-date totals (Jan through the viewed month, of the
// viewed month's year), a monthly chart for that same span, and the bank
// balances as of that point in time. Defaults to the current month.
export async function getFinancialSummary(year?: number, month?: number) {
  const now = new Date();
  const viewedMonth = year !== undefined && month !== undefined ? new Date(year, month, 1) : now;
  const monthStart = startOfMonth(viewedMonth);
  const monthEnd = endOfMonth(viewedMonth);

  const [
    receivedAgg,
    activeStudentsForRevenue,
    totalContributors,
    expenses,
    teacherPayroll,
    paidTeacherTotal,
    partnerSplit,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { referenceMonth: monthStart, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.studentProfile.findMany({
      where: { status: "ACTIVE" },
      select: {
        monthlyValue: true,
        thirdPartyAmount: true,
        startDate: true,
        billingStartDate: true,
        groupMembers: { select: { monthlyValue: true } },
      },
    }),
    prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
    prisma.expense.findMany(),
    // Previsto still assumes every scheduled class happens — unaffected by
    // the payout tracking below, same as before.
    getTeacherPayrollForMonth(viewedMonth.getFullYear(), viewedMonth.getMonth()),
    // What's actually been paid out to teachers this month — see the
    // Payout model. Only this counts as a "gasto"; classes given but not
    // yet paid don't (that's still tracked live, just not here — see
    // Férias and the teacher's own payroll view, both unaffected).
    getPaidTeacherPayrollTotal(viewedMonth.getFullYear(), viewedMonth.getMonth()),
    getPartnerSplitForMonth(viewedMonth.getFullYear(), viewedMonth.getMonth()),
  ]);

  const revenueRealized = Number(receivedAgg._sum.amount ?? 0);
  // The course's real monthly total is the student's own portion plus
  // whatever a third party covers on top of it, plus every group
  // participant's own separate share (see getBillingSlots). Only counts a
  // student once they'd actually become billable by the viewed month —
  // otherwise a currently-active student's current monthlyValue would
  // wrongly inflate "previsto" for a month before they even enrolled.
  const revenuePrevisto = activeStudentsForRevenue
    .filter((s) => (s.billingStartDate ?? s.startDate) <= monthEnd)
    .reduce(
      (sum, s) =>
        sum +
        Number(s.monthlyValue) +
        Number(s.thirdPartyAmount ?? 0) +
        s.groupMembers.reduce((memberSum, m) => memberSum + Number(m.monthlyValue), 0),
      0
    );
  const manualExpenseRealized = expenseTotalForMonth(expenses, monthStart, monthEnd, now);
  const manualExpensePrevisto = expenseTotalForMonth(expenses, monthStart, monthEnd);

  // "Gasto" for the month is manually-typed expenses (Marketing/R&D/
  // Outros/any stray Parceiros entries) plus the two derived
  // categories that never get their own Expense rows: teacher payroll
  // and the partners' own payout — so "Em caixa"/"Caixa previsto" below
  // land on what's actually left after everyone (teachers, partners) has
  // been paid, not just after manual bills. Realizado only counts what's
  // actually been marked paid (paidTeacherTotal, partnerSplit.realizado);
  // previsto keeps assuming the whole month happens as scheduled.
  const expenseRealized = manualExpenseRealized + paidTeacherTotal + partnerSplit.realizado.partnersTotal;
  const expensePrevisto = manualExpensePrevisto + teacherPayroll.totals.previsto + partnerSplit.previsto.partnersTotal;

  // Provisão de férias dos professores: 8,3% do que cada um ganhou —
  // previsto (mês inteiro, supondo que toda aula marcada aconteça) e
  // realizado (só o que já foi dado) — mensal (só o mês visualizado) e
  // anual (soma mês a mês desde janeiro até o mês visualizado, com o
  // payroll real de cada mês). Ver getTeacherFeriasForYear.
  const ferias = await getTeacherFeriasForYear(viewedMonth.getFullYear(), viewedMonth.getMonth());

  const monthsInYear = Array.from({ length: viewedMonth.getMonth() + 1 }, (_, m) => {
    const mStart = new Date(viewedMonth.getFullYear(), m, 1);
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
    // Exposed separately (not just folded into expenseRealized/Previsto
    // above) so the Resumo card can show the Professores line on its own.
    teacherPayrollRealizado: paidTeacherTotal,
    teacherPayrollPrevisto: teacherPayroll.totals.previsto,
    feriasMonthlyPrevisto: ferias.totals.monthlyPrevisto,
    feriasMonthlyRealizado: ferias.totals.monthlyRealizado,
    feriasAnnualPrevisto: ferias.totals.annualPrevisto,
    feriasAnnualRealizado: ferias.totals.annualRealizado,
    ytdGrossRevenue,
    ytdExpenses,
    ytdProfit: ytdGrossRevenue - ytdExpenses,
    yearlyChart,
    totalContributors,
    partnerSplit,
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
      } else if (student.status === "ACTIVE" && isSlotBillableForMonth(billingStart, cursor, slot.dueDay)) {
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
// /api/cron/mark-late-payments) plus whatever's set by hand. Only ACTIVE
// students — once someone's canceled or paused, whatever they still owe is
// tracked elsewhere, not chased down on this list.
export async function getLatePayments() {
  const payments = await prisma.payment.findMany({
    where: { status: "LATE", student: { status: "ACTIVE" } },
    include: {
      student: {
        include: { user: true, teacher: { include: { user: true } }, groupMembers: { include: { user: true } } },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return payments.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    studentName: resolveSlotStudentName(p.payerName, p.student),
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
