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

export function getBillingSlots(student: {
  monthlyValue: unknown;
  dueDay: number;
  bankAccount: BankAccount;
  thirdPartyAmount: unknown;
  thirdPartyPayerName: string | null;
  thirdPartyDueDay: number | null;
  thirdPartyBankAccount: BankAccount | null;
}): BillingSlot[] {
  const own = Number(student.monthlyValue);
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
    slots.push({ payerName: null, amount: own, dueDay: student.dueDay, bankAccount: student.bankAccount });
  }

  return slots;
}
