"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { getStudentChargeSlotsForMonth, createMissingPaymentsForMonth } from "@/server/student-charges";
import type { PaymentStatus, BankAccount } from "@prisma/client";
import type { ActionState } from "@/server/actions/students";

function dueDateFor(monthStart: Date, day: number) {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, daysInMonth));
}

// Sets a cobrança status for one of a student's billing slots (their own,
// or a third party's — see server/student-charges.ts) in a given reference month —
// whether or not it's been "generated" yet. If no Payment row exists for
// that slot/month (nobody's clicked "Gerar cobranças", or it's a past
// month being backfilled), one is created directly with the requested
// status, so any slot in any month can be set to Pendente/Pago/Atrasado
// from the Cobranças table, and changed again later if something was
// marked by mistake. referenceMonth must be the actual month being viewed
// — defaulting to "today's month" would silently edit the wrong month's
// data whenever a past or future month is on screen.
export async function setCobrancaStatus(
  studentId: string,
  payerName: string | null,
  status: PaymentStatus,
  referenceMonth: Date,
  // Defaults to right now the moment status is set to PAID — pass an
  // explicit date to record a payment confirmed late with its real date
  // instead (e.g. backfilling, or marking something paid a few days after
  // it actually happened).
  paidAtOverride?: Date | null
) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const paidAt = status === "PAID" ? (paidAtOverride ?? new Date()) : null;

  const existing = await prisma.payment.findFirst({
    where: { studentId, referenceMonth: monthStart, payerName },
  });

  let payment;
  if (existing) {
    payment = await prisma.payment.update({
      where: { id: existing.id },
      data: { status, paidAt },
    });
  } else {
    const slot = (await getStudentChargeSlotsForMonth(studentId, monthStart)).find(
      (s) => s.payerName === payerName
    );
    if (!slot) throw new Error("Cobrança não encontrada para este pagador.");
    payment = await prisma.payment.create({
      data: {
        studentId,
        referenceMonth: monthStart,
        amount: slot.amount,
        dueDate: dueDateFor(monthStart, slot.dueDay),
        payerName: slot.payerName,
        status,
        paidAt,
      },
    });
  }

  await recordAudit({
    entityType: "Payment",
    entityId: payment.id,
    action: "STATUS_CHANGE",
    actor,
    changes: {
      status,
      payerName,
      referenceMonth: monthStart.toISOString(),
      paidAt: paidAt?.toISOString() ?? null,
    },
  });
  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
}

// Directly sets amount/dueDate for one specific month's cobrança — a
// one-time, this-month-only exception (a discount, a due date pushed for a
// holiday, ...) that intentionally does NOT touch the student's cadastro
// (monthlyValueHistory/dueDayHistory) and has no effect on any other
// month's row, since each month is already its own independent Payment
// row. The note is optional — left blank when there's nothing worth
// writing down.
export async function setPaymentOverride(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");

  const studentId = String(formData.get("studentId") ?? "");
  const payerName = String(formData.get("payerName") ?? "") || null;
  const referenceMonthRaw = String(formData.get("referenceMonth") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!studentId || !referenceMonthRaw || !amountRaw || !dueDateRaw) {
    return { error: "Preencha todos os campos." };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Valor inválido." };
  }
  const referenceMonth = new Date(referenceMonthRaw);
  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(referenceMonth.getTime()) || Number.isNaN(dueDate.getTime())) {
    return { error: "Data inválida." };
  }
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);

  const existing = await prisma.payment.findFirst({
    where: { studentId, referenceMonth: monthStart, payerName },
  });

  let payment;
  if (existing) {
    payment = await prisma.payment.update({
      where: { id: existing.id },
      data: { amount, dueDate, manualOverride: true, manualOverrideNote: note || null },
    });
  } else {
    payment = await prisma.payment.create({
      data: {
        studentId,
        referenceMonth: monthStart,
        amount,
        dueDate,
        payerName,
        status: dueDate < new Date() ? "LATE" : "PENDING",
        manualOverride: true,
        manualOverrideNote: note || null,
      },
    });
  }

  await recordAudit({
    entityType: "Payment",
    entityId: payment.id,
    action: "UPDATE",
    actor,
    changes: { manualOverride: true, amount, dueDate: dueDate.toISOString(), note: note || null, payerName },
  });

  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);

  return { success: "Cobrança ajustada manualmente." };
}

// Clears the manualOverride flag/note on a row — e.g. the explanation was
// written down by mistake, or is no longer relevant. Every Payment row is
// already its own independent source of truth for amount/dueDate (nothing
// ever recomputes them from the cadastro), so this only removes the
// displayed note; it never changes the amount or due date themselves.
export async function clearPaymentOverride(studentId: string, payerName: string | null, referenceMonth: Date) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);

  const existing = await prisma.payment.findFirst({
    where: { studentId, referenceMonth: monthStart, payerName },
  });
  if (!existing) return;

  await prisma.payment.update({
    where: { id: existing.id },
    data: { manualOverride: false, manualOverrideNote: null },
  });

  await recordAudit({
    entityType: "Payment",
    entityId: existing.id,
    action: "UPDATE",
    actor,
    changes: { manualOverride: false },
  });

  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
}

// Sets (or clears, with bankAccount: null) which account this one month's
// cobrança actually goes to — a simple, no-note, this-month-only
// exception, same pattern as the gasto bank-account override. Doesn't
// touch amount/dueDate/status, and has no effect on any other month,
// since each month is already its own independent Payment row.
export async function setPaymentBankAccountOverride(
  studentId: string,
  payerName: string | null,
  referenceMonth: Date,
  bankAccount: BankAccount | null
) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);

  const existing = await prisma.payment.findFirst({
    where: { studentId, referenceMonth: monthStart, payerName },
  });

  let payment;
  if (existing) {
    payment = await prisma.payment.update({
      where: { id: existing.id },
      data: { bankAccountOverride: bankAccount },
    });
  } else {
    const slot = (await getStudentChargeSlotsForMonth(studentId, monthStart)).find(
      (s) => s.payerName === payerName
    );
    if (!slot) throw new Error("Cobrança não encontrada para este pagador.");
    const dueDate = dueDateFor(monthStart, slot.dueDay);
    payment = await prisma.payment.create({
      data: {
        studentId,
        referenceMonth: monthStart,
        amount: slot.amount,
        dueDate,
        payerName: slot.payerName,
        status: dueDate < new Date() ? "LATE" : "PENDING",
        bankAccountOverride: bankAccount,
      },
    });
  }

  await recordAudit({
    entityType: "Payment",
    entityId: payment.id,
    action: "UPDATE",
    actor,
    changes: { bankAccountOverride: bankAccount, payerName, referenceMonth: monthStart.toISOString() },
  });

  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);

  return payment;
}

// Permanently removes one real cobrança row — for a genuine data-entry
// mistake (wrong month/payer entered, a duplicate, ...), not for anything
// that actually happened. Every other action in this system deliberately
// never deletes a Payment row (editing or deleting its originating
// StudentCharge only ever affects future generation, see
// deleteStudentCharge) precisely so real history is never silently lost —
// this is the one explicit, admin-confirmed exception for when a row
// shouldn't have existed at all. Has no effect on the charge that may
// have generated it, if any; if that charge is still active and the
// deleted month is still inside its range, the usual generation path
// (the monthly cron, or editing/re-saving the charge) will recreate an
// equivalent row the next time it runs.
export async function deletePayment(paymentId: string, studentId: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");

  await recordAudit({
    entityType: "Payment",
    entityId: paymentId,
    action: "DELETE",
    actor,
  });

  await prisma.payment.delete({ where: { id: paymentId } });

  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
}

// Manual fallback for the daily cron (/api/cron/mark-late-payments) — runs
// the exact same two sweeps (auto-generate this month's missing cobranças,
// then flip any overdue PENDING to LATE) on demand, for when the scheduled
// cron didn't fire (e.g. a paused/rate-limited Vercel account). Safe to run
// any time; both sweeps are idempotent no-ops for anything already correct.
export async function runLatePaymentsSweep() {
  const actor = await requireRole("ADMIN");

  const generated = await createMissingPaymentsForMonth(new Date());

  const { count: markedLate } = await prisma.payment.updateMany({
    where: { status: "PENDING", dueDate: { lt: new Date() } },
    data: { status: "LATE" },
  });

  await recordAudit({
    entityType: "Payment",
    entityId: "manual-sweep",
    action: "UPDATE",
    actor,
    changes: { generated, markedLate },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath("/admin/financial/atrasados");
  revalidatePath("/admin/students/[id]", "page");
  revalidatePath("/coordinator/students/[id]", "page");

  return { generated, markedLate };
}

export async function generateMonthlyPayments(referenceMonth: Date) {
  const actor = await requireRole("ADMIN");
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);

  await createMissingPaymentsForMonth(monthStart);

  await recordAudit({
    entityType: "Payment",
    entityId: monthStart.toISOString(),
    action: "CREATE",
    actor,
    changes: { batch: true, month: monthStart.toISOString() },
  });

  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
}
