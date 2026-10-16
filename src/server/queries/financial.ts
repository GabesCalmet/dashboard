import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { bankAccountLabel } from "@/lib/labels";
import { resolveSlotStudentName } from "@/server/billing";
import { getChargeSlotsForMonth, getTotalChargeRevenueForMonth } from "@/server/student-charges";
import { getTeacherPayrollForMonth, getTeacherFeriasForYear } from "@/server/queries/teachers";
import { getPaidTeacherPayrollTotal, getPartnerPayoutAmount } from "@/server/queries/payouts";
import type { BankAccount, Expense, PaymentStatus, StudentCharge } from "@prisma/client";

// Groups a flat list of StudentCharge rows (already ordered newest-first,
// e.g. via `orderBy: { createdAt: "desc" }`) by studentId, and converts
// each row's Decimal amount to a plain number — the shape
// getChargeSlotsForMonth expects. Shared by every query below that needs
// per-student charge slots for a given month.
function groupChargesByStudent(charges: StudentCharge[]) {
  const byStudent = new Map<string, { payerName: string | null; amount: number; frequency: StudentCharge["frequency"]; date: Date; dueDay: number | null; endDate: Date | null; bankAccount: BankAccount }[]>();
  for (const c of charges) {
    const entry = { ...c, amount: Number(c.amount) };
    const bucket = byStudent.get(c.studentId);
    if (bucket) bucket.push(entry);
    else byStudent.set(c.studentId, [entry]);
  }
  return byStudent;
}

export async function getFinancialOverview(year?: number, month?: number) {
  const now = new Date();
  const viewedMonth = year !== undefined && month !== undefined ? new Date(year, month, 1) : now;
  const monthStart = startOfMonth(viewedMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = monthEnd.getDate();

  const studentInclude = {
    user: true,
    teacher: { include: { user: true } },
    groupMembers: { include: { user: true } },
  } as const;

  const [received, charges, payments] = await Promise.all([
    prisma.payment.aggregate({
      where: { referenceMonth: monthStart, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.studentCharge.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({
      where: { referenceMonth: monthStart },
      include: { student: { include: studentInclude } },
    }),
  ]);

  const chargesByStudent = groupChargesByStudent(charges);
  const studentById = new Map(payments.map((p) => [p.studentId, p.student]));

  // Any studentId with a currently-active charge but no payment loaded yet
  // this month needs its own name/teacher fetched separately.
  const missingStudentIds = [...chargesByStudent.keys()].filter((id) => !studentById.has(id));
  if (missingStudentIds.length > 0) {
    const fetched = await prisma.studentProfile.findMany({
      where: { id: { in: missingStudentIds } },
      include: studentInclude,
    });
    for (const s of fetched) studentById.set(s.id, s);
  }

  // Every real Payment row this month shows up unconditionally first — a
  // row that's already real history must never vanish just because its
  // originating charge was since edited/deleted (same principle as
  // getStudentPaymentHistory). Then a live placeholder for any still-
  // active charge slot with no real row yet, so nobody's missing just
  // because "Gerar cobranças" hasn't run for this month.
  const rows: {
    id: string | null;
    studentId: string;
    studentName: string;
    teacherName: string | null;
    payerName: string | null;
    amount: number;
    dueDate: Date;
    paidAt: Date | null;
    status: PaymentStatus;
    bankAccount: BankAccount;
  }[] = [];
  const claimedKeys = new Set<string>();

  for (const p of payments) {
    const slot = getChargeSlotsForMonth(chargesByStudent.get(p.studentId) ?? [], monthStart).find(
      (s) => s.payerName === p.payerName
    );
    rows.push({
      id: p.id,
      studentId: p.studentId,
      studentName: resolveSlotStudentName(p.payerName, p.student),
      teacherName: p.student.teacher?.user.name ?? null,
      payerName: p.payerName,
      amount: Number(p.amount),
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      status: p.status,
      bankAccount: p.bankAccountOverride ?? slot?.bankAccount ?? p.student.bankAccount,
    });
    claimedKeys.add(`${p.studentId}::${p.payerName ?? ""}`);
  }

  for (const [studentId, list] of chargesByStudent) {
    const student = studentById.get(studentId);
    if (!student) continue;
    for (const slot of getChargeSlotsForMonth(list, monthStart)) {
      const key = `${studentId}::${slot.payerName ?? ""}`;
      if (claimedKeys.has(key)) continue;
      const dueDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(slot.dueDay, daysInMonth));
      const status: PaymentStatus = dueDate < now ? "LATE" : "PENDING";
      rows.push({
        id: null,
        studentId,
        studentName: resolveSlotStudentName(slot.payerName, student),
        teacherName: student.teacher?.user.name ?? null,
        payerName: slot.payerName,
        amount: slot.amount,
        dueDate,
        paidAt: null,
        status,
        bankAccount: slot.bankAccount,
      });
    }
  }

  rows.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

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

function recurringActiveInMonth(e: Expense, monthStart: Date, monthEnd: Date) {
  return e.date <= monthEnd && (!e.endDate || e.endDate >= monthStart);
}

// Sums expenses that fall within [monthStart, monthEnd] — the whole
// month's known/expected total ("previsto"). amountOverrides (expenseId →
// this month's overridden amount, see ExpenseOccurrence.amountOverride)
// lets a one-off exception for this specific month replace the expense's
// normal flat amount, same as the rest of this function stays unaware of
// which months are recurring vs one-time beyond their own date range.
export function expenseTotalForMonth(
  expenses: Expense[],
  monthStart: Date,
  monthEnd: Date,
  amountOverrides?: Map<string, number>
) {
  return expenses.reduce((sum, e) => {
    const amount = amountOverrides?.get(e.id) ?? Number(e.amount);
    if (e.frequency === "ONE_TIME") {
      if (e.date < monthStart || e.date > monthEnd) return sum;
      return sum + amount;
    }
    if (!recurringActiveInMonth(e, monthStart, monthEnd)) return sum;
    return sum + amount;
  }, 0);
}

// Sums only expenses whose occurrence for this exact month has been
// explicitly marked PAID (paidExpenseIds — an expenseId with a real
// ExpenseOccurrence row for this month at status PAID). Replaces the old
// date-cutoff approximation ("the due date already passed, so assume it
// was paid") — confirmation is a manual action now (see
// setExpenseOccurrenceStatus): an overdue but still-unconfirmed expense
// shows as Atrasado, not realizado, until someone actually marks it Pago.
// Respects the same per-month amountOverrides as expenseTotalForMonth.
export function expenseRealizedForMonth(
  expenses: Expense[],
  paidExpenseIds: Set<string>,
  monthStart: Date,
  monthEnd: Date,
  amountOverrides?: Map<string, number>
) {
  return expenses.reduce((sum, e) => {
    if (!paidExpenseIds.has(e.id)) return sum;
    const amount = amountOverrides?.get(e.id) ?? Number(e.amount);
    if (e.frequency === "ONE_TIME") {
      if (e.date < monthStart || e.date > monthEnd) return sum;
      return sum + amount;
    }
    if (!recurringActiveInMonth(e, monthStart, monthEnd)) return sum;
    return sum + amount;
  }, 0);
}

// Every confirmed-Pago occurrence of an expense up through `now`, one item
// per month actually paid — replaces the old "the date already passed, so
// assume it's accrued" approximation, which not only double-counted an
// expense still sitting unconfirmed but also completely ignored any
// per-month amount/bankAccount override (see setExpenseAmountOverride/
// setExpenseBankAccountOverride): a bank balance must only reflect what's
// actually left the account, the same way "Gastos reais" already does
// (expenseRealizedForMonth) — this is that same rule, just itemized
// across every month instead of summed for one.
function expensePaidItemsToDate(
  e: Expense,
  paidOccurrencesByExpenseId: Map<
    string,
    { referenceMonth: Date; amountOverride: unknown; bankAccountOverride: BankAccount | null }[]
  >,
  now: Date
): { amount: number; bankAccount: BankAccount; date: Date }[] {
  const occurrences = paidOccurrencesByExpenseId.get(e.id) ?? [];
  const items: { amount: number; bankAccount: BankAccount; date: Date }[] = [];

  if (e.frequency === "ONE_TIME") {
    const monthStart = new Date(e.date.getFullYear(), e.date.getMonth(), 1);
    const occ = occurrences.find((o) => o.referenceMonth.getTime() === monthStart.getTime());
    if (occ && e.date <= now) {
      items.push({
        amount: occ.amountOverride != null ? Number(occ.amountOverride) : Number(e.amount),
        bankAccount: occ.bankAccountOverride ?? e.bankAccount,
        date: e.date,
      });
    }
    return items;
  }

  for (const occ of occurrences) {
    const daysInMo = new Date(occ.referenceMonth.getFullYear(), occ.referenceMonth.getMonth() + 1, 0).getDate();
    const day = Math.min(e.dayOfMonth ?? 1, daysInMo);
    const effectiveDate = new Date(occ.referenceMonth.getFullYear(), occ.referenceMonth.getMonth(), day);
    if (effectiveDate > now) continue;
    items.push({
      amount: occ.amountOverride != null ? Number(occ.amountOverride) : Number(e.amount),
      bankAccount: occ.bankAccountOverride ?? e.bankAccount,
      date: effectiveDate,
    });
  }
  return items;
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

  const [paidPayments, charges, expenses, paidExpenseOccurrences, payouts, manualIncomes] = await Promise.all([
    // Counted as of its dueDate, not paidAt — a payment that was really
    // for (say) January but only got marked PAID in the system months
    // later should still show up as January's money, not get pushed to
    // whenever someone happened to click the status dropdown.
    prisma.payment.findMany({
      where: { status: "PAID", dueDate: { lte: now } },
      include: { student: { include: { user: true, groupMembers: { include: { user: true } } } } },
    }),
    prisma.studentCharge.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.expense.findMany(),
    prisma.expenseOccurrence.findMany({
      where: { status: "PAID" },
      select: { expenseId: true, referenceMonth: true, amountOverride: true, bankAccountOverride: true },
    }),
    prisma.payout.findMany({
      where: { paidAt: { lte: now } },
      include: { teacher: { include: { user: true } } },
    }),
    prisma.manualIncome.findMany({ where: { date: { lte: now } } }),
  ]);

  const chargesByStudent = groupChargesByStudent(charges);

  const paidOccurrencesByExpenseId = new Map<string, typeof paidExpenseOccurrences>();
  for (const o of paidExpenseOccurrences) {
    const bucket = paidOccurrencesByExpenseId.get(o.expenseId);
    if (bucket) bucket.push(o);
    else paidOccurrencesByExpenseId.set(o.expenseId, [o]);
  }

  const received: Record<BankAccount, number> = { GABES: 0, JOE: 0, ASAAS: 0 };
  const receivedItems: Record<BankAccount, BankLedgerItem[]> = { GABES: [], JOE: [], ASAAS: [] };
  for (const p of paidPayments) {
    // Resolved the same way the Cobranças table resolves it — historically,
    // for this payment's own referenceMonth, from that student's charges at
    // the time, not whatever's current today. A student/third-party/group-
    // member's account can change over time, and a flat current-value
    // lookup here would misattribute every past payment to whichever
    // account happens to be current now regardless of what was actually
    // true back then — see the Gabriel Lima VIP-147 bug this originally
    // fixed. getChargeSlotsForMonth also correctly resolves a group
    // member's own account instead of always falling back to the primary
    // student's.
    const slot = getChargeSlotsForMonth(chargesByStudent.get(p.studentId) ?? [], p.referenceMonth).find(
      (s) => s.payerName === p.payerName
    );
    const account = p.bankAccountOverride ?? slot?.bankAccount ?? p.student.bankAccount;
    const amount = Number(p.amount);
    received[account] += amount;
    receivedItems[account].push({
      // payerName itself is always the right label here — a group
      // member's own share names them directly, and a third-party payer
      // (e.g. "IRCE") isn't a group member and must show as themselves,
      // not fall back to the student's name (resolveSlotStudentName is
      // for a different context: an admin-wide student/aluno listing,
      // where a bare payerName needs to be mapped back to the actual
      // person it belongs to).
      id: p.id,
      label: p.payerName ?? p.student.user.name,
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
    for (const item of expensePaidItemsToDate(e, paidOccurrencesByExpenseId, now)) {
      spent[item.bankAccount] += item.amount;
      spentItems[item.bankAccount].push({
        id: `${e.id}:${item.date.toISOString().slice(0, 7)}`,
        label: e.frequency === "RECURRING" ? `${e.description} (recorrente)` : e.description,
        amount: item.amount,
        date: item.date.toISOString(),
      });
    }
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

  const [receivedAgg, revenuePrevisto, teacherPayroll, paidTeacherTotal, paidJoe, paidGabriel] = await Promise.all([
    prisma.payment.aggregate({
      where: { referenceMonth: monthStart, status: "PAID" },
      _sum: { amount: true },
    }),
    getTotalChargeRevenueForMonth(monthStart),
    getTeacherPayrollForMonth(year, month),
    getPaidTeacherPayrollTotal(year, month),
    getPartnerPayoutAmount("PARTNER_JOE", year, month),
    getPartnerPayoutAmount("PARTNER_GABRIEL", year, month),
  ]);

  const revenueRealized = Number(receivedAgg._sum.amount ?? 0);

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
    revenuePrevisto,
    totalContributors,
    expenses,
    expenseOccurrences,
    teacherPayroll,
    paidTeacherTotal,
    partnerSplit,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { referenceMonth: monthStart, status: "PAID" },
      _sum: { amount: true },
    }),
    // Every active charge slot's amount for the viewed month — the
    // student's own portion, a third party's, each group member's (see
    // getChargeSlotsForMonth). A charge's own date range already governs
    // whether it counts for this month, so nothing here needs a separate
    // "has this student become billable yet" guard the way the old
    // cadastro-history version did.
    getTotalChargeRevenueForMonth(monthStart),
    prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
    prisma.expense.findMany(),
    prisma.expenseOccurrence.findMany({
      where: { referenceMonth: monthStart },
      select: { expenseId: true, status: true, amountOverride: true },
    }),
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
  const paidExpenseIds = new Set(
    expenseOccurrences.filter((o) => o.status === "PAID").map((o) => o.expenseId)
  );
  const expenseAmountOverrides = new Map(
    expenseOccurrences
      .filter((o) => o.amountOverride != null)
      .map((o) => [o.expenseId, Number(o.amountOverride)])
  );
  const manualExpenseRealized = expenseRealizedForMonth(
    expenses,
    paidExpenseIds,
    monthStart,
    monthEnd,
    expenseAmountOverrides
  );
  const manualExpensePrevisto = expenseTotalForMonth(expenses, monthStart, monthEnd, expenseAmountOverrides);

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

  // "Gasto" per month here must match the same realizado definition used
  // for the single viewed month above (manualExpenseRealized +
  // paidTeacherTotal + partnerSplit.realizado.partnersTotal) — otherwise
  // the yearly chart/YTD figures (and the "Lucro" they drive) only reflect
  // manually-typed expenses and silently omit teacher payroll and partner
  // payouts, understating real spending and overstating profit.
  const monthlyGastos = await Promise.all(
    monthsInYear.map(async (mo) => {
      const monthYear = mo.start.getFullYear();
      const monthIdx = mo.start.getMonth();
      const [occurrences, paidTeacher, partners] = await Promise.all([
        prisma.expenseOccurrence.findMany({
          where: { referenceMonth: mo.start, status: "PAID" },
          select: { expenseId: true, amountOverride: true },
        }),
        getPaidTeacherPayrollTotal(monthYear, monthIdx),
        getPartnerSplitForMonth(monthYear, monthIdx),
      ]);
      const paidIds = new Set(occurrences.map((o) => o.expenseId));
      const overrides = new Map(
        occurrences.filter((o) => o.amountOverride != null).map((o) => [o.expenseId, Number(o.amountOverride)])
      );
      const manualGasto = expenseRealizedForMonth(expenses, paidIds, mo.start, mo.end, overrides);
      return manualGasto + paidTeacher + partners.realizado.partnersTotal;
    })
  );

  const yearlyChart = monthsInYear.map((mo, i) => {
    const receita = Number(monthlyReceitas[i]._sum.amount ?? 0);
    const gasto = monthlyGastos[i];
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

// A student's own cobrança definitions (see StudentCharge) — the "+" list
// on their Financeiro tab, shown above the Payment history so the admin
// can see/edit what's actually driving generation (amount, due day, bank
// account, vigência) without digging through individual months.
export async function listStudentCharges(studentId: string) {
  return prisma.studentCharge.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
}

// Full billing picture for one student's own Financeiro tab — every real
// generated Payment plus a live placeholder (same rule the Cobranças table
// uses) for any month since their earliest StudentCharge that hasn't been
// generated yet, so the tab doesn't only show whichever months an admin
// happened to click "Gerar cobranças" for. Each charge's own date/endDate
// governs which months it produces a placeholder for — see
// getChargeSlotsForMonth. Real past rows are always included regardless of
// whether any current charge still produces a matching slot for that
// month (a row that's already real history must never vanish just because
// its charge was since edited or deleted).
export async function getStudentPaymentHistory(studentId: string) {
  const [student, realPayments, charges] = await Promise.all([
    prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId } }),
    prisma.payment.findMany({ where: { studentId } }),
    prisma.studentCharge.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } }),
  ]);
  const chargeList = charges.map((c) => ({ ...c, amount: Number(c.amount) }));

  const now = new Date();
  const end = new Date(now.getFullYear() + 1, 11, 1);

  const rows: {
    id: string | null;
    payerName: string | null;
    amount: number;
    referenceMonth: Date;
    dueDate: Date;
    paidAt: Date | null;
    status: PaymentStatus;
    // bankAccount is the cadastro-resolved default for this slot/month
    // (unaffected by any override, so a "Padrão (X)" label always names
    // the real default); effectiveBankAccount is what actually applies —
    // the override when one's set, otherwise the same as bankAccount.
    bankAccount: BankAccount;
    effectiveBankAccount: BankAccount;
    bankAccountOverride: BankAccount | null;
    manualOverride: boolean;
    manualOverrideNote: string | null;
  }[] = [];

  // Every real Payment row is shown unconditionally, regardless of whether
  // the cadastro's CURRENT config still produces a matching billing slot
  // for that exact month — a row that's already been generated (or paid)
  // is real history and must never silently vanish just because a later
  // price/due-day history entry created a gap that the slot resolver now
  // (correctly) treats as "not billable" for NEW charges. Without this, a
  // real row stayed invisible here while still showing up everywhere else
  // that reads Payment directly (bank balances, Receita) — see the Mateus
  // Santana VIP-162 bug this fixes (a declared Mar–Sep gap hid his already-
  // paid March row from his own Cobranças tab).
  const claimedKeys = new Set<string>();
  for (const real of realPayments) {
    const monthKey = real.referenceMonth.toISOString().slice(0, 7);
    const slot = getChargeSlotsForMonth(chargeList, real.referenceMonth).find(
      (s) => s.payerName === real.payerName
    );
    rows.push({
      id: real.id,
      payerName: real.payerName,
      amount: Number(real.amount),
      referenceMonth: real.referenceMonth,
      dueDate: real.dueDate,
      paidAt: real.paidAt,
      status: real.status,
      bankAccount: slot?.bankAccount ?? student.bankAccount,
      effectiveBankAccount: real.bankAccountOverride ?? slot?.bankAccount ?? student.bankAccount,
      bankAccountOverride: real.bankAccountOverride,
      manualOverride: real.manualOverride,
      manualOverrideNote: real.manualOverrideNote,
    });
    claimedKeys.add(`${monthKey}::${real.payerName ?? ""}`);
  }

  // Then a live placeholder for any still-active charge slot with no real
  // row yet (not yet generated/paid) — walking from the earliest charge's
  // own start, skipping anything a real row above already covers. Not
  // gated by student.status — a charge's own date range is now the sole
  // authority on whether it's still billable (see
  // createMissingPaymentsForMonth), so a paused/canceled student whose
  // charge was never "encerrada" still shows what it would generate, same
  // as any other open charge.
  if (chargeList.length > 0) {
    const earliestMonth = chargeList.reduce((min, c) => {
      const m = new Date(c.date.getFullYear(), c.date.getMonth(), 1);
      return m < min ? m : min;
    }, new Date(chargeList[0].date.getFullYear(), chargeList[0].date.getMonth(), 1));

    const cursor = new Date(earliestMonth);
    while (cursor <= end) {
      const monthKey = cursor.toISOString().slice(0, 7);
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

      for (const slot of getChargeSlotsForMonth(chargeList, cursor)) {
        const key = `${monthKey}::${slot.payerName ?? ""}`;
        if (claimedKeys.has(key)) continue;
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
          effectiveBankAccount: slot.bankAccount,
          bankAccountOverride: null,
          manualOverride: false,
          manualOverrideNote: null,
        });
      }

      cursor.setMonth(cursor.getMonth() + 1);
    }
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

  const studentIds = [...new Set(payments.map((p) => p.studentId))];
  const charges = studentIds.length
    ? await prisma.studentCharge.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const chargesByStudent = groupChargesByStudent(charges);

  return payments.map((p) => {
    const slot = getChargeSlotsForMonth(chargesByStudent.get(p.studentId) ?? [], p.referenceMonth).find(
      (s) => s.payerName === p.payerName
    );
    return {
      id: p.id,
      studentId: p.studentId,
      studentName: resolveSlotStudentName(p.payerName, p.student),
      teacherName: p.student.teacher?.user.name ?? null,
      payerName: p.payerName,
      amount: Number(p.amount),
      dueDate: p.dueDate,
      referenceMonth: p.referenceMonth,
      bankAccount: p.bankAccountOverride ?? slot?.bankAccount ?? p.student.bankAccount,
    };
  });
}
