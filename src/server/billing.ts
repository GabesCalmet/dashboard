import type { BankAccount } from "@prisma/client";

// A student is billed as one or two "slots" per month: their own portion
// (payerName: null, amount = monthlyValue) and, if a third party also
// covers part of the course, a second slot billed to that third party for
// thirdPartyAmount — additional to monthlyValue, not carved out of it, so
// the course's real total is monthlyValue + thirdPartyAmount. Shared
// between billing generation and the Cobranças table so both stay in sync
// about who owes what and when.
export type BillingSlot = {
  payerName: string | null;
  amount: number;
  dueDay: number;
  bankAccount: BankAccount;
};

export type ValueHistoryEntry = { amount: number; from?: string; until?: string };

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
// no history entry covers (which is every month for a student who's never
// had a change recorded).
function resolveHistoricalAmount(current: unknown, history: unknown, referenceMonth: Date) {
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
  return match ? match.amount : Number(current);
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

  return slots;
}
