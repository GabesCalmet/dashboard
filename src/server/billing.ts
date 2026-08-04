import type { BankAccount } from "@prisma/client";

// A student is billed as one or two "slots" per month: their own portion
// (payerName: null) and, if a third party covers part or all of the
// monthlyValue, a second slot billed to that third party with its own due
// day and bank account. Shared between billing generation and the
// Cobranças table so both stay in sync about who owes what and when.
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
  const total = Number(student.monthlyValue);
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

  const remaining = total - thirdPartyAmt;
  if (remaining > 0) {
    slots.push({ payerName: null, amount: remaining, dueDay: student.dueDay, bankAccount: student.bankAccount });
  }

  return slots;
}
