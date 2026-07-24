"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";

export async function markPaymentPaid(paymentId: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "PAID", paidAt: new Date() },
  });
  await recordAudit({
    entityType: "Payment",
    entityId: paymentId,
    action: "STATUS_CHANGE",
    actor,
    changes: { status: "PAID" },
  });
  revalidatePath("/admin/financial");
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
}
