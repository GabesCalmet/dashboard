"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { getBillingSlots, withBillingGroupMembers } from "@/server/billing";
import type { PaymentStatus } from "@prisma/client";

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
  referenceMonth: Date
) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const paidAt = status === "PAID" ? new Date() : null;

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
    changes: { status, payerName, referenceMonth: monthStart.toISOString() },
  });
  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
}

export async function generateMonthlyPayments(referenceMonth: Date) {
  const actor = await requireRole("ADMIN");
  const students = await prisma.studentProfile.findMany({
    where: { status: "ACTIVE" },
    include: { groupMembers: { include: { user: true } } },
  });

  const now = new Date();
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);

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
      // Backfilling a past month (e.g. after fixing a billing bug) should
      // never create a fresh "Pendente" row for a due date that's already
      // gone by — matches the same LATE-if-overdue rule the live Cobranças
      // placeholder already uses before a row exists.
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
