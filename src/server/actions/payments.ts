"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import {
  getBillingSlots,
  withBillingGroupMembers,
  createMissingPaymentsForMonth,
  resolveBillingStart,
  isSlotBillableForMonth,
} from "@/server/billing";
import type { PaymentStatus, BankAccount } from "@prisma/client";
import type { ActionState } from "@/server/actions/students";

function dueDateFor(monthStart: Date, day: number) {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, daysInMonth));
}

// Sets a cobrança status for one of a student's billing slots (their own,
// or a third party's — see server/billing.ts) in a given reference month —
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
    const student = await prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      include: { groupMembers: { include: { user: true } } },
    });
    const slot = getBillingSlots(withBillingGroupMembers(student), monthStart).find(
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
// row. Marks the row manualOverride so resyncStudentPayments leaves it
// alone from here on instead of silently recomputing it back to whatever
// the cadastro would normally produce. The note is optional — left blank
// when there's nothing worth writing down.
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

// Directly creates a brand-new cobrança row for one student/month/payer —
// the "Adicionar cobrança" counterpart to createExpense, and the first
// piece of the new Gastos-style billing model: a month's charge entered
// by hand instead of always being derived from the cadastro's
// monthlyValueHistory/dueDayHistory/bankAccountHistory. Always marked
// manualOverride so resyncStudentPayments (while it still exists) never
// silently recomputes it back to whatever the cadastro would produce.
// Refuses to create a second row for the same student/month/payer — that
// case is an edit, not a new cobrança, so the caller should use the
// pencil (setPaymentOverride) on the existing row instead.
export async function createManualPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");

  const studentId = String(formData.get("studentId") ?? "");
  const payerName = String(formData.get("payerName") ?? "").trim() || null;
  const referenceMonthRaw = String(formData.get("referenceMonth") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const bankAccount = String(formData.get("bankAccount") ?? "") as BankAccount;
  const status = String(formData.get("status") ?? "PENDING") as PaymentStatus;
  const paidAtRaw = String(formData.get("paidAt") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!studentId || !referenceMonthRaw || !amountRaw || !dueDateRaw || !bankAccount) {
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
  const paidAt = status === "PAID" ? new Date(paidAtRaw || Date.now()) : null;

  const existing = await prisma.payment.findFirst({
    where: { studentId, referenceMonth: monthStart, payerName },
  });
  if (existing) {
    return { error: "Já existe uma cobrança para este mês e pagador — edite-a em vez de criar outra." };
  }

  const payment = await prisma.payment.create({
    data: {
      studentId,
      referenceMonth: monthStart,
      amount,
      dueDate,
      payerName,
      status,
      paidAt,
      bankAccountOverride: bankAccount,
      manualOverride: true,
      manualOverrideNote: note || null,
    },
  });

  await recordAudit({
    entityType: "Payment",
    entityId: payment.id,
    action: "CREATE",
    actor,
    changes: { manual: true, amount, dueDate: dueDate.toISOString(), payerName, status, bankAccount },
  });

  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);

  return { success: "Cobrança adicionada." };
}

// Reverts a manually-overridden row back to following the cadastro —
// clears the protection flag so the next "Atualizar cobranças" recomputes
// amount/dueDate normally. Doesn't touch the values itself; they stay as
// whatever they currently are until that resync runs.
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
    const student = await prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      include: { groupMembers: { include: { user: true } } },
    });
    const slot = getBillingSlots(withBillingGroupMembers(student), monthStart).find(
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

// Re-derives amount/dueDate for every existing Payment row (any status,
// including already-PAID ones) from the student's CURRENT billing config
// (monthlyValue/dueDay, each resolved historically for that row's own
// referenceMonth via its own *History) — the same values a freshly
// generated cobrança for that month would get. Never touches
// status/paidAt, so marking something paid is never undone and a row
// whose payer slot no longer exists at all is left alone rather than
// deleted — only the structural "how much, due when" fields follow the
// cadastro, the same way a lesson's time can be corrected without
// touching whether it was actually given.
//
// Also backfills any month that has NO Payment row at all between the
// student's (re-resolved) billing start and today — e.g. pulling
// billingStartDate/a history entry's "from" earlier in the cadastro after
// some of those months have already passed. createMissingPaymentsForMonth
// only ever runs for "now" (via cron/the manual sweep), so a past month
// newly covered by a backdated cadastro edit is otherwise invisible until
// someone clicks "Gerar cobranças" for it by hand, one month at a time.
export async function resyncStudentPayments(studentId: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");

  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: { groupMembers: { include: { user: true } } },
  });
  const billingStudent = withBillingGroupMembers(student);
  const payments = await prisma.payment.findMany({ where: { studentId } });

  let updated = 0;
  for (const payment of payments) {
    if (payment.manualOverride) continue;
    const slots = getBillingSlots(billingStudent, payment.referenceMonth);
    const slot = slots.find((s) => s.payerName === payment.payerName);
    if (!slot) continue;
    const newAmount = slot.amount;
    const newDueDate = dueDateFor(payment.referenceMonth, slot.dueDay);
    if (Number(payment.amount) !== newAmount || payment.dueDate.getTime() !== newDueDate.getTime()) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { amount: newAmount, dueDate: newDueDate },
      });
      updated++;
    }
  }

  const existingKeys = new Set(payments.map((p) => `${p.referenceMonth.getTime()}:${p.payerName ?? ""}`));
  const now = new Date();
  const billingStart = resolveBillingStart(student);
  let created = 0;
  // A canceled/paused student only gets new rows auto-created when their
  // endDate is set — the authoritative "billing stopped here" signal,
  // independent of status, which also caps isSlotBillableForMonth below.
  // Without one there's no safe upper bound: a paused/canceled student's
  // cadastro still carries whatever dueDay/bankAccount/monthlyValue was
  // last set, which — with nothing after it marking an end — would
  // otherwise look like "still billable today" and resurrect months well
  // past when they actually stopped (see the Luciana GRU-97 fix this
  // guards). An ACTIVE student is always eligible regardless.
  const canBackfill = student.status === "ACTIVE" || student.endDate !== null;
  if (canBackfill && billingStart <= now) {
    const cursor = new Date(billingStart.getFullYear(), billingStart.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= lastMonth) {
      const monthStart = new Date(cursor);
      for (const slot of getBillingSlots(billingStudent, monthStart)) {
        if (!isSlotBillableForMonth(billingStart, monthStart, slot.dueDay, student.endDate)) continue;
        const key = `${monthStart.getTime()}:${slot.payerName ?? ""}`;
        if (existingKeys.has(key)) continue;
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
        existingKeys.add(key);
        created++;
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  if (updated > 0 || created > 0) {
    await recordAudit({
      entityType: "Payment",
      entityId: studentId,
      action: "UPDATE",
      actor,
      changes: { resyncedCount: updated, createdCount: created },
    });
  }

  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);

  return { updated, created };
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
