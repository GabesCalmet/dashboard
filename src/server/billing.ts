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

export function getBillingSlots(
  student: {
    monthlyValue: unknown;
    monthlyValueHistory?: unknown;
    dueDay: number;
    dueDayHistory?: unknown;
    bankAccount: BankAccount;
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
  const thirdPartyAmt = student.thirdPartyAmount ? Number(student.thirdPartyAmount) : 0;
  const slots: BillingSlot[] = [];

  if (thirdPartyAmt > 0 && student.thirdPartyPayerName && student.thirdPartyDueDay) {
    slots.push({
      payerName: student.thirdPartyPayerName,
      amount: thirdPartyAmt,
      dueDay: student.thirdPartyDueDay,
      bankAccount: student.thirdPartyBankAccount ?? student.bankAccount,
    });
  }

  if (own > 0) {
    slots.push({ payerName: null, amount: own, dueDay, bankAccount: student.bankAccount });
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

function dueDateFor(monthStart: Date, day: number) {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, daysInMonth));
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
    // Never bill a month before the student became billable — governed by
    // billingStartDate when set, independent of when their classes
    // actually started (startDate).
    if ((student.billingStartDate ?? student.startDate) > monthEnd) continue;
    for (const slot of getBillingSlots(withBillingGroupMembers(student), monthStart)) {
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
