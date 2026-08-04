"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import type { PaymentStatus } from "@prisma/client";

// Sets this month's cobrança status for a student — whether or not it's
// been "generated" yet. If no Payment row exists for the current month
// (nobody's clicked "Gerar cobranças"), one is created directly with the
// requested status, so any active student's charge can be set to
// Pendente/Pago/Atrasado straight from the Cobranças table, and changed
// again later if something was marked by mistake.
export async function setCobrancaStatus(studentId: string, status: PaymentStatus) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidAt = status === "PAID" ? now : null;

  const existing = await prisma.payment.findFirst({
    where: { studentId, referenceMonth: monthStart },
  });

  let payment;
  if (existing) {
    payment = await prisma.payment.update({
      where: { id: existing.id },
      data: { status, paidAt },
    });
  } else {
    const student = await prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId } });
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const dueDate = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      Math.min(student.dueDay, daysInMonth)
    );
    payment = await prisma.payment.create({
      data: {
        studentId,
        referenceMonth: monthStart,
        amount: student.monthlyValue,
        dueDate,
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
    changes: { status },
  });
  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
}

export async function generateMonthlyPayments(referenceMonth: Date) {
  const actor = await requireRole("ADMIN");
  const students = await prisma.studentProfile.findMany({
    where: { status: "ACTIVE" },
  });

  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);

  for (const student of students) {
    const existing = await prisma.payment.findFirst({
      where: { studentId: student.id, referenceMonth: monthStart },
    });
    if (existing) continue;

    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const dueDate = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      Math.min(student.dueDay, daysInMonth)
    );

    await prisma.payment.create({
      data: {
        studentId: student.id,
        referenceMonth: monthStart,
        amount: student.monthlyValue,
        dueDate,
      },
    });

    await prisma.notification.create({
      data: {
        userId: student.userId,
        type: "PAYMENT_DUE",
        title: "Pagamento do mês disponível",
        message: "Sua mensalidade deste mês já está disponível para pagamento.",
      },
    });
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
