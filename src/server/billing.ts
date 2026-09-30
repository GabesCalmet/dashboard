import { prisma } from "@/lib/prisma";
import type { BankAccount, PaymentStatus } from "@prisma/client";

// A student is billed as one or more "slots" per month: their own portion
// (payerName: null, amount = monthlyValue), a slot for a third party if one
// covers part of the course (additional to monthlyValue, not carved out of
// it), and one more slot per "grupo" participant beyond the primary, each
// billed separately for their own amount, due day and bank account.
// Shared between billing generation and the Cobranças table so both stay
// in sync about who owes what, when, and where it goes.
export type BillingSlot = {
  payerName: string | null;
  amount: number;
  dueDay: number;
  bankAccount: BankAccount;
};

export type ValueHistoryEntry = { amount: number; from?: string; until?: string };

// Adapts a fetched StudentProfile (with its groupMembers relation included,
// via `groupMembers: { include: { user: true } }`) into the shape
// getBillingSlots expects — every call site needs this same reshape, so
// it's centralized here instead of repeated inline.
export function withBillingGroupMembers<
  T extends {
    groupMembers: {
      monthlyValue: unknown;
      monthlyValueHistory: unknown;
      dueDay: number;
      dueDayHistory: unknown;
      bankAccount: BankAccount;
      user: { name: string };
    }[];
  },
>(student: T) {
  return {
    ...student,
    groupMembers: student.groupMembers.map((m) => ({
      name: m.user.name,
      monthlyValue: m.monthlyValue,
      monthlyValueHistory: m.monthlyValueHistory,
      dueDay: m.dueDay,
      dueDayHistory: m.dueDayHistory,
      bankAccount: m.bankAccount,
    })),
  };
}

// A billing row's Pagador can be the student themselves (payerName: null),
// a group member paying their own share (payerName: their name), or a
// third party (payerName: the third party's name). Only the first two are
// actual students — the "Aluno" column should show whichever of them owns
// this slot, not always fall back to the primary/group-owner's name.
export function resolveSlotStudentName(
  payerName: string | null,
  student: { user: { name: string }; groupMembers: { user: { name: string } }[] }
): string {
  if (payerName) {
    const member = student.groupMembers.find((m) => m.user.name === payerName);
    if (member) return member.user.name;
  }
  return student.user.name;
}

function parseValueHistory(value: unknown): ValueHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is ValueHistoryEntry =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).amount === "number"
    )
    .map((e) => ({
      amount: e.amount,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

// Resolves what a value (monthlyValue, dueDay, ...) should be for a
// specific reference month — using the historical entry in effect then, if
// one was configured, falling back to the current flat value for any month
// no history entry covers (which is every month for a student/member who's
// never had a change recorded).
export function resolveHistoricalAmount(current: unknown, history: unknown, referenceMonth: Date) {
  const entries = parseValueHistory(history);
  if (entries.length === 0) return Number(current);

  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);
  const match = entries.find((e) => {
    const from = e.from ? new Date(e.from) : null;
    const until = e.until ? new Date(e.until) : null;
    if (from && from > monthEnd) return false;
    if (until && until < monthStart) return false;
    return true;
  });
  if (match) return match.amount;

  // No entry covers this month. Every entry actually entered in this app
  // carries a real "from" (the full history is recorded, not left with an
  // implicit "since forever" baseline) — so if the reference month is
  // before every one of them, the value genuinely hadn't started applying
  // yet (e.g. a "grupo" member who joined mid-year), and falling back to
  // today's current value would wrongly resurrect a charge for months
  // before they even joined. Only fall back to current for a month that's
  // NOT before the earliest entry (e.g. a gap after the last "until", or
  // an entry left with no "from" at all, meaning "since forever").
  const boundedFroms = entries.filter((e) => e.from).map((e) => new Date(e.from!).getTime());
  const hasUnboundedEntry = entries.some((e) => !e.from);
  if (!hasUnboundedEntry && boundedFroms.length > 0 && monthEnd.getTime() < Math.min(...boundedFroms)) {
    return 0;
  }
  return Number(current);
}

type SelectHistoryEntry = { id: string; from?: string; until?: string };

function parseSelectHistory(value: unknown): SelectHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is SelectHistoryEntry =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).id === "string"
    )
    .map((e) => ({
      id: (e as Record<string, unknown>).id as string,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

// Resolves which bank account a payment should route to for a specific
// reference month — same month-overlap convention as
// resolveHistoricalAmount, but for an id-based value (BankAccount) instead
// of a number, since a student can switch accounts mid-course. Falls back
// to the current flat value for any month no history entry covers — unlike
// an amount, there's no "hasn't started yet" concept for which account
// routes a payment, so there's nothing to resolve to instead of current.
export function resolveHistoricalBankAccount(
  current: BankAccount,
  history: unknown,
  referenceMonth: Date
): BankAccount {
  const entries = parseSelectHistory(history);
  if (entries.length === 0) return current;

  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);
  const match = entries.find((e) => {
    const from = e.from ? new Date(e.from) : null;
    const until = e.until ? new Date(e.until) : null;
    if (from && from > monthEnd) return false;
    if (until && until < monthStart) return false;
    return true;
  });
  return match ? (match.id as BankAccount) : current;
}

export function getBillingSlots(
  student: {
    monthlyValue: unknown;
    monthlyValueHistory?: unknown;
    dueDay: number;
    dueDayHistory?: unknown;
    bankAccount: BankAccount;
    bankAccountHistory?: unknown;
    thirdPartyAmount: unknown;
    thirdPartyPayerName: string | null;
    thirdPartyDueDay: number | null;
    thirdPartyBankAccount: BankAccount | null;
    // "Grupo" participants beyond the primary — each bills separately for
    // their own resolved amount, due day and bank account.
    groupMembers?: {
      name: string;
      monthlyValue: unknown;
      monthlyValueHistory?: unknown;
      dueDay: number;
      dueDayHistory?: unknown;
      bankAccount: BankAccount;
    }[];
  },
  referenceMonth: Date
): BillingSlot[] {
  const own = resolveHistoricalAmount(student.monthlyValue, student.monthlyValueHistory, referenceMonth);
  const dueDay = resolveHistoricalAmount(student.dueDay, student.dueDayHistory, referenceMonth);
  const ownBankAccount = resolveHistoricalBankAccount(
    student.bankAccount,
    student.bankAccountHistory,
    referenceMonth
  );
  const thirdPartyAmt = student.thirdPartyAmount ? Number(student.thirdPartyAmount) : 0;
  const slots: BillingSlot[] = [];

  if (thirdPartyAmt > 0 && student.thirdPartyPayerName && student.thirdPartyDueDay) {
    slots.push({
      payerName: student.thirdPartyPayerName,
      amount: thirdPartyAmt,
      dueDay: student.thirdPartyDueDay,
      bankAccount: student.thirdPartyBankAccount ?? ownBankAccount,
    });
  }

  if (own > 0) {
    slots.push({ payerName: null, amount: own, dueDay, bankAccount: ownBankAccount });
  }

  for (const member of student.groupMembers ?? []) {
    const memberAmount = resolveHistoricalAmount(
      member.monthlyValue,
      member.monthlyValueHistory,
      referenceMonth
    );
    if (memberAmount > 0) {
      const memberDueDay = resolveHistoricalAmount(member.dueDay, member.dueDayHistory, referenceMonth);
      slots.push({
        payerName: member.name,
        amount: memberAmount,
        dueDay: memberDueDay,
        bankAccount: member.bankAccount,
      });
    }
  }

  return slots;
}

export function dueDateFor(monthStart: Date, day: number) {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, daysInMonth));
}

// A slot's charge for a given month is only real once its actual due date
// falls on/after the student became billable — checking billingStart
// against the whole MONTH (as every caller here used to) treats the entire
// month as billable the moment any day of it is on/after billingStartDate,
// which can produce a due date that's earlier than enrollment itself (e.g.
// billingStartDate the 15th, dueDay the 1st — the resolved due date, the
// 1st, is two weeks before the student even started). Comparing the actual
// resolved due date instead means a student who starts partway through a
// month with an early dueDay correctly gets billed starting the following
// month, not a nonsensical charge due before they existed.
export function isSlotBillableForMonth(billingStart: Date, monthStart: Date, dueDay: number): boolean {
  return dueDateFor(monthStart, dueDay) >= billingStart;
}

// Creates any still-missing Payment row for the given month across every
// ACTIVE student's billing slots — the same idempotent logic the "Gerar
// cobranças" admin action runs by hand (see generateMonthlyPayments),
// extracted so the daily cron (/api/cron/mark-late-payments) can run it
// automatically too. Without this, a month an admin forgot to generate has
// no real Payment row at all, so it's invisible to the "Pagamentos
// atrasados" dashboard box and the Atrasados page even once its due date
// has passed — only the student's own Financeiro tab shows it (as a live,
// never-persisted placeholder). A slot already overdue at creation time is
// marked LATE immediately rather than a fresh Pendente, matching that same
// placeholder's rule. Returns how many rows were created.
export async function createMissingPaymentsForMonth(referenceMonth: Date) {
  const students = await prisma.studentProfile.findMany({
    where: { status: "ACTIVE" },
    include: { groupMembers: { include: { user: true } } },
  });

  const now = new Date();
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);

  let created = 0;
  for (const student of students) {
    const billingStart = student.billingStartDate ?? student.startDate;
    // Fast skip — the whole month is still ahead of billingStartDate, so no
    // slot in it could possibly be billable yet.
    if (billingStart > monthEnd) continue;
    for (const slot of getBillingSlots(withBillingGroupMembers(student), monthStart)) {
      // The real check — this slot's own resolved due date must actually
      // fall on/after billingStartDate, not just somewhere in the same
      // month (see isSlotBillableForMonth).
      if (!isSlotBillableForMonth(billingStart, monthStart, slot.dueDay)) continue;
      const existing = await prisma.payment.findFirst({
        where: { studentId: student.id, referenceMonth: monthStart, payerName: slot.payerName },
      });
      if (existing) continue;

      const dueDate = dueDateFor(monthStart, slot.dueDay);
      const status: PaymentStatus = dueDate < now ? "LATE" : "PENDING";

      await prisma.payment.create({
        data: {
          studentId: student.id,
          referenceMonth: monthStart,
          amount: slot.amount,
          dueDate,
          payerName: slot.payerName,
          status,
        },
      });
      created++;

      // Only notify the student themselves — a third-party payer has no
      // portal account to notify.
      if (!slot.payerName) {
        await prisma.notification.create({
          data: {
            userId: student.userId,
            type: "PAYMENT_DUE",
            title: "Pagamento do mês disponível",
            message: "Sua mensalidade deste mês já está disponível para pagamento.",
          },
        });
      }
    }
  }

  return created;
}
