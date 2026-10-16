import { prisma } from "@/lib/prisma";
import { dueDateFor } from "@/server/billing";
import type { BankAccount, ExpenseFrequency } from "@prisma/client";

export type StudentChargeLike = {
  payerName: string | null;
  amount: number;
  frequency: ExpenseFrequency;
  date: Date;
  dueDay: number | null;
  endDate: Date | null;
  bankAccount: BankAccount;
};

// Creates any Payment row a charge should have produced by `through`
// (inclusive, capped at the charge's own endDate) that doesn't already
// exist — one row for a ONE_TIME charge (its own `date` as the due date),
// one per month from `date` onward for a RECURRING one (each month's due
// date from `dueDay`). Skips any month that already has a Payment row for
// this studentId/referenceMonth/payerName, so it's safe to call
// repeatedly — e.g. every time a charge is created or edited — without
// ever duplicating or touching an existing row. bankAccountOverride is
// set explicitly on every row this creates (rather than left to whatever
// the old cadastro-based slot resolution would otherwise guess for an
// unrecognized payerName) so a charge's own account is always honored.
// Returns how many rows were created.
export async function materializeStudentCharge(
  studentId: string,
  charge: StudentChargeLike,
  through: Date
): Promise<number> {
  const now = new Date();
  let created = 0;

  if (charge.frequency === "ONE_TIME") {
    const monthStart = new Date(charge.date.getFullYear(), charge.date.getMonth(), 1);
    if (monthStart > through) return created;
    const existing = await prisma.payment.findFirst({
      where: { studentId, referenceMonth: monthStart, payerName: charge.payerName },
    });
    if (!existing) {
      await prisma.payment.create({
        data: {
          studentId,
          referenceMonth: monthStart,
          amount: charge.amount,
          dueDate: charge.date,
          payerName: charge.payerName,
          status: charge.date < now ? "LATE" : "PENDING",
          bankAccountOverride: charge.bankAccount,
        },
      });
      created++;
    }
    return created;
  }

  // RECURRING
  const dueDay = charge.dueDay ?? 10;
  const cappedThrough = charge.endDate && charge.endDate < through ? charge.endDate : through;
  const cursor = new Date(charge.date.getFullYear(), charge.date.getMonth(), 1);
  const endMonth = new Date(cappedThrough.getFullYear(), cappedThrough.getMonth(), 1);

  while (cursor <= endMonth) {
    const monthStart = new Date(cursor);
    const existing = await prisma.payment.findFirst({
      where: { studentId, referenceMonth: monthStart, payerName: charge.payerName },
    });
    if (!existing) {
      const dueDate = dueDateFor(monthStart, dueDay);
      await prisma.payment.create({
        data: {
          studentId,
          referenceMonth: monthStart,
          amount: charge.amount,
          dueDate,
          payerName: charge.payerName,
          status: dueDate < now ? "LATE" : "PENDING",
          bankAccountOverride: charge.bankAccount,
        },
      });
      created++;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return created;
}
