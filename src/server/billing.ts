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
//
// zeroOnGap (default false) controls what an UNCOVERED month falls back to
// when some entry's own "from" starts later (meaning this month is either
// before the earliest entry, or sitting in a real gap between two bounded
// windows): true resolves it to 0, false falls back to the current flat
// value same as any other uncovered month. Only pass true for an amount
// that's actually allowed to mean "don't charge this month" — monthlyValue
// (own/member/teacher-revenue) — where a real price-undefined gap must not
// silently inherit today's price (see the Moises VIP-172 phantom-charge
// bug this was built for). Every other field resolved this way — dueDay,
// lessonsPerMonth, hourlyRate — has no such "doesn't apply" state: a day
// of the month or a lessons count or a pay rate of 0 is never correct, it's
// just broken (e.g. dueDay 0 resolves to the last day of the PREVIOUS
// month, which can push a slot's due date before billingStart and make an
// otherwise-billable month wrongly skipped entirely — the bug that hit
// Andréa VIP-155 once a leftover dueDayHistory entry, dated after her real
// billing start but with the same value as current, acted as if due day
// itself hadn't been declared yet for that month).
export function resolveHistoricalAmount(
  current: unknown,
  history: unknown,
  referenceMonth: Date,
  { zeroOnGap = false }: { zeroOnGap?: boolean } = {}
) {
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

  if (!zeroOnGap) return Number(current);

  // No entry covers this month. Falling back to today's current value is
  // only right for a month after every recorded entry (nothing newer has
  // been declared yet, so "whatever's current" is the best guess) — NOT
  // for a month before the earliest entry, or for a real gap sitting
  // between two separate bounded windows (e.g. a student who had a
  // recorded period in Jan–Feb, then nothing until a later Sep entry —
  // the months in between were never covered by anything and must not
  // silently inherit today's price). Any entry whose own "from" is still
  // ahead of this month means something explicit resumes later, which
  // makes this month either pre-history or an internal gap either way —
  // both resolve to 0, never to "same as today."
  const hasEntryStartingAfter = entries.some((e) => e.from && new Date(e.from) > monthEnd);
  if (hasEntryStartingAfter) return 0;
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
  const own = resolveHistoricalAmount(student.monthlyValue, student.monthlyValueHistory, referenceMonth, {
    zeroOnGap: true,
  });
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
      referenceMonth,
      { zeroOnGap: true }
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

// billingStartDate/startDate is only the FALLBACK floor — the same
// convention as a lessonSchedule entry's own "from" overriding the lesson
// generator's anchor. If monthlyValueHistory or dueDayHistory carries an
// entry explicitly dated earlier (a deliberately backdated price/due-day
// record), that earlier date is honored instead, so billing actually
// follows whatever's recorded in the cadastro rather than silently
// clamping it to whichever date happens to be in billingStartDate.
export function earliestHistoryFrom(...histories: unknown[]): Date | null {
  let earliest: Date | null = null;
  for (const history of histories) {
    for (const e of parseValueHistory(history)) {
      if (!e.from) continue;
      const from = new Date(e.from);
      if (!earliest || from < earliest) earliest = from;
    }
  }
  return earliest;
}

export function resolveBillingStart(student: {
  billingStartDate: Date | null;
  startDate: Date;
  monthlyValueHistory: unknown;
  dueDayHistory: unknown;
}): Date {
  const floor = student.billingStartDate ?? student.startDate;
  const earliestFrom = earliestHistoryFrom(student.monthlyValueHistory, student.dueDayHistory);
  return earliestFrom && earliestFrom < floor ? earliestFrom : floor;
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
// billableThrough (typically a student's endDate) caps the other end —
// once enrollment had a real, known end, nothing due after it should ever
// be auto-generated (a placeholder, a resync backfill, the monthly cron),
// no matter what dueDay/bankAccount/monthlyValue still read as once their
// own vigência history runs out and falls back to "whatever's current."
export function isSlotBillableForMonth(
  billingStart: Date,
  monthStart: Date,
  dueDay: number,
  billableThrough: Date | null = null
): boolean {
  const dueDate = dueDateFor(monthStart, dueDay);
  if (dueDate < billingStart) return false;
  if (billableThrough && dueDate > billableThrough) return false;
  return true;
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
    const billingStart = resolveBillingStart(student);
    // Fast skip — the whole month is still ahead of billingStart, so no
    // slot in it could possibly be billable yet.
    if (billingStart > monthEnd) continue;
    for (const slot of getBillingSlots(withBillingGroupMembers(student), monthStart)) {
      // The real check — this slot's own resolved due date must actually
      // fall on/after billingStartDate, not just somewhere in the same
      // month (see isSlotBillableForMonth).
      if (!isSlotBillableForMonth(billingStart, monthStart, slot.dueDay, student.endDate)) continue;
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
