// A student is billed as one or two "slots" per month: their own portion
// (payerName: null) and, if a third party covers part or all of the
// monthlyValue, a second slot billed to that third party with its own due
// day. Shared between billing generation and the Cobranças table so both
// stay in sync about who owes what and when.
export type BillingSlot = { payerName: string | null; amount: number; dueDay: number };

export function getBillingSlots(student: {
  monthlyValue: unknown;
  dueDay: number;
  thirdPartyAmount: unknown;
  thirdPartyPayerName: string | null;
  thirdPartyDueDay: number | null;
}): BillingSlot[] {
  const total = Number(student.monthlyValue);
  const thirdPartyAmt = student.thirdPartyAmount ? Number(student.thirdPartyAmount) : 0;
  const slots: BillingSlot[] = [];

  if (thirdPartyAmt > 0 && student.thirdPartyPayerName && student.thirdPartyDueDay) {
    slots.push({
      payerName: student.thirdPartyPayerName,
      amount: thirdPartyAmt,
      dueDay: student.thirdPartyDueDay,
    });
  }

  const remaining = total - thirdPartyAmt;
  if (remaining > 0) {
    slots.push({ payerName: null, amount: remaining, dueDay: student.dueDay });
  }

  return slots;
}
