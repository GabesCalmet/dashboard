import { prisma } from "@/lib/prisma";
import { brazilToday } from "@/lib/timezone";
import { dueDateFor } from "@/server/billing";
import type { BankAccount, ExpenseFrequency, PaymentStatus } from "@prisma/client";

export type StudentChargeLike = {
  payerName: string | null;
  amount: number;
  frequency: ExpenseFrequency;
  date: Date;
  dueDay: number | null;
  endDate: Date | null;
  bankAccount: BankAccount;
};

// A student's billing slot for one specific month — the StudentCharge
// counterpart to the old history-based BillingSlot in billing.ts (see
// getBillingSlots), now resolved from explicit charge rows instead of
// vigência arrays on the cadastro.
export type ChargeSlot = {
  payerName: string | null;
  amount: number;
  dueDay: number;
  bankAccount: BankAccount;
};

// Resolves which of a student's charges are active for a given reference
// month — one slot per distinct payerName (their own, a group member's, a
// third party's). `charges` must be ordered newest-created-first (see
// listStudentCharges) so that if two charges somehow overlap for the same
// payer/month, the most recently declared one wins — same "latest
// declaration wins" convention the old history resolver used
// (pickLatestOverlap), just simpler since a charge's own date/endDate is
// already an explicit window rather than something to infer.
export function getChargeSlotsForMonth(
  charges: StudentChargeLike[],
  referenceMonth: Date
): ChargeSlot[] {
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const slots: ChargeSlot[] = [];
  const seen = new Set<string>();

  for (const c of charges) {
    const key = c.payerName ?? "";
    if (seen.has(key)) continue;

    if (c.frequency === "ONE_TIME") {
      const chargeMonth = new Date(c.date.getFullYear(), c.date.getMonth(), 1);
      if (chargeMonth.getTime() !== monthStart.getTime()) continue;
      slots.push({ payerName: c.payerName, amount: c.amount, dueDay: c.date.getDate(), bankAccount: c.bankAccount });
      seen.add(key);
      continue;
    }

    const startMonth = new Date(c.date.getFullYear(), c.date.getMonth(), 1);
    if (startMonth > monthStart) continue;
    if (c.endDate) {
      const endMonth = new Date(c.endDate.getFullYear(), c.endDate.getMonth(), 1);
      if (endMonth < monthStart) continue;
    }
    slots.push({ payerName: c.payerName, amount: c.amount, dueDay: c.dueDay ?? 10, bankAccount: c.bankAccount });
    seen.add(key);
  }

  return slots;
}

// A single student's charge slots for one month — used wherever a Payment
// row needs to be created from scratch for a slot that doesn't have one
// yet (see setCobrancaStatus/setPaymentBankAccountOverride), to know what
// amount/dueDay/bankAccount that new row should start with.
export async function getStudentChargeSlotsForMonth(
  studentId: string,
  referenceMonth: Date
): Promise<ChargeSlot[]> {
  const charges = await prisma.studentCharge.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
  return getChargeSlotsForMonth(
    charges.map((c) => ({ ...c, amount: Number(c.amount) })),
    referenceMonth
  );
}

// Batched version of "what's this student's own charge worth this month"
// for every id in `studentIds` at once — built for teacher payroll's
// Percentual mode (a teacher paid a % of the student's own charge), which
// resolves this once per student/teacher pair and can't afford an
// individual query each time. Only the student's own slot (payerName:
// null) is relevant there — a third party's or group member's portion
// isn't what the assigned teacher's percentage is computed against.
// Missing from the returned map means "no active own-charge this month,"
// which callers should treat as 0.
export async function getOwnChargeAmountsForMonth(
  studentIds: string[],
  referenceMonth: Date
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (studentIds.length === 0) return result;

  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const charges = await prisma.studentCharge.findMany({
    where: { studentId: { in: studentIds } },
    orderBy: { createdAt: "desc" },
  });

  const byStudent = new Map<string, typeof charges>();
  for (const c of charges) {
    const bucket = byStudent.get(c.studentId);
    if (bucket) bucket.push(c);
    else byStudent.set(c.studentId, [c]);
  }

  for (const [studentId, list] of byStudent) {
    const slot = getChargeSlotsForMonth(
      list.map((c) => ({ ...c, amount: Number(c.amount) })),
      monthStart
    ).find((s) => s.payerName === null);
    if (slot) result.set(studentId, slot.amount);
  }

  return result;
}

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
  const now = brazilToday();
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

// Sums every active charge slot's amount for a given month, across every
// student — the StudentCharge-era "Receita prevista" figure (see
// getFinancialSummary/getPartnerSplitForMonth), replacing the old flat
// sum of ACTIVE students' current monthlyValue/thirdPartyAmount/group
// members' monthlyValue. Not filtered by StudentProfile.status — same
// reasoning as createMissingPaymentsForMonth: a charge's own date range
// is now the sole authority on whether it still counts as expected
// revenue for the month.
export async function getTotalChargeRevenueForMonth(referenceMonth: Date): Promise<number> {
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const charges = await prisma.studentCharge.findMany({ orderBy: { createdAt: "desc" } });

  const byStudent = new Map<string, typeof charges>();
  for (const c of charges) {
    const bucket = byStudent.get(c.studentId);
    if (bucket) bucket.push(c);
    else byStudent.set(c.studentId, [c]);
  }

  let total = 0;
  for (const list of byStudent.values()) {
    const slots = getChargeSlotsForMonth(
      list.map((c) => ({ ...c, amount: Number(c.amount) })),
      monthStart
    );
    total += slots.reduce((sum, s) => sum + s.amount, 0);
  }
  return total;
}

// Creates any still-missing Payment row for the given month across every
// student with an active charge that month — the StudentCharge-era
// replacement for the old cadastro-driven createMissingPaymentsForMonth
// (see billing.ts's history). Runs as the daily cron
// (/api/cron/mark-late-payments) and the manual "Gerar cobranças" action.
// Deliberately not filtered by StudentProfile.status — a charge's own
// date/endDate is now the sole authority on whether it's still billable;
// a paused/canceled student whose charge was never "encerrada" keeps
// generating, same as any other open charge, so stopping it is now an
// explicit action (see endStudentCharge/deleteStudentCharge) rather than
// something that happens implicitly from a status change. A slot already
// overdue at creation time is marked LATE immediately rather than a fresh
// Pendente, matching every other generation path in this system. Returns
// how many rows were created.
export async function createMissingPaymentsForMonth(referenceMonth: Date) {
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const now = brazilToday();

  const charges = await prisma.studentCharge.findMany({
    orderBy: { createdAt: "desc" },
    include: { student: { select: { userId: true } } },
  });

  const byStudent = new Map<string, typeof charges>();
  for (const c of charges) {
    const bucket = byStudent.get(c.studentId);
    if (bucket) bucket.push(c);
    else byStudent.set(c.studentId, [c]);
  }

  let created = 0;
  for (const [studentId, list] of byStudent) {
    const slots = getChargeSlotsForMonth(
      list.map((c) => ({ ...c, amount: Number(c.amount) })),
      monthStart
    );
    for (const slot of slots) {
      const existing = await prisma.payment.findFirst({
        where: { studentId, referenceMonth: monthStart, payerName: slot.payerName },
      });
      if (existing) continue;

      const dueDate = dueDateFor(monthStart, slot.dueDay);
      const status: PaymentStatus = dueDate < now ? "LATE" : "PENDING";

      await prisma.payment.create({
        data: {
          studentId,
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
            userId: list[0].student.userId,
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
