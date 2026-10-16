"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { studentChargeFormSchema } from "@/lib/validation/student-charge";
import { materializeStudentCharge } from "@/server/student-charges";
import type { ActionState } from "@/server/actions/students";

function revalidateStudentPaths(studentId: string) {
  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
}

// Registers a new cobrança definition for a student — the "Adicionar
// cobrança" dialog, mirroring createExpense. Immediately backfills any
// Payment row the charge should already have produced by now (same
// convention as the old resyncStudentPayments backfill, minus ever
// touching an existing row — see materializeStudentCharge), so a past-
// dated recorrente charge or a one-off historical cobrança shows up right
// away instead of waiting on the next auto-generation.
export async function createStudentCharge(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const raw = Object.fromEntries(formData.entries());
  const parsed = studentChargeFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const payerName = data.payerName?.trim() || null;
  const date = new Date(data.date);
  const endDate = data.frequency === "RECURRING" && data.endDate ? new Date(data.endDate) : null;

  const charge = await prisma.studentCharge.create({
    data: {
      studentId: data.studentId,
      payerName,
      description: data.description || null,
      amount: data.amount,
      frequency: data.frequency,
      date,
      dueDay: data.frequency === "RECURRING" ? data.dueDay : null,
      endDate,
      bankAccount: data.bankAccount,
    },
  });

  const created = await materializeStudentCharge(
    data.studentId,
    {
      payerName,
      amount: data.amount,
      frequency: data.frequency,
      date,
      dueDay: data.frequency === "RECURRING" ? (data.dueDay ?? null) : null,
      endDate,
      bankAccount: data.bankAccount,
    },
    new Date()
  );

  await recordAudit({
    entityType: "StudentCharge",
    entityId: charge.id,
    action: "CREATE",
    actor,
    changes: { studentId: data.studentId, amount: data.amount, frequency: data.frequency, payerName },
  });

  revalidateStudentPaths(data.studentId);
  return {
    success:
      created > 0
        ? `Cobrança cadastrada — ${created} mês(es) gerado(s).`
        : "Cobrança cadastrada.",
  };
}

export async function updateStudentCharge(
  chargeId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const raw = Object.fromEntries(formData.entries());
  const parsed = studentChargeFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const payerName = data.payerName?.trim() || null;
  const date = new Date(data.date);
  const endDate = data.frequency === "RECURRING" && data.endDate ? new Date(data.endDate) : null;

  await prisma.studentCharge.update({
    where: { id: chargeId },
    data: {
      payerName,
      description: data.description || null,
      amount: data.amount,
      frequency: data.frequency,
      date,
      dueDay: data.frequency === "RECURRING" ? data.dueDay : null,
      endDate,
      bankAccount: data.bankAccount,
    },
  });

  // Re-run the backfill — e.g. the start date was moved earlier, or an
  // endDate was pushed back out — never touches a month that already has
  // its own Payment row (see materializeStudentCharge), so this is safe
  // to run on every edit regardless of what actually changed.
  const created = await materializeStudentCharge(
    data.studentId,
    {
      payerName,
      amount: data.amount,
      frequency: data.frequency,
      date,
      dueDay: data.frequency === "RECURRING" ? (data.dueDay ?? null) : null,
      endDate,
      bankAccount: data.bankAccount,
    },
    new Date()
  );

  await recordAudit({
    entityType: "StudentCharge",
    entityId: chargeId,
    action: "UPDATE",
    actor,
    changes: { studentId: data.studentId, amount: data.amount, frequency: data.frequency, payerName },
  });

  revalidateStudentPaths(data.studentId);
  return {
    success:
      created > 0 ? `Cobrança atualizada — ${created} mês(es) gerado(s).` : "Cobrança atualizada.",
  };
}

// Stops a recorrente charge from here on — sets endDate to today, same as
// endRecurringExpense. Never touches any Payment row already generated.
export async function endStudentCharge(chargeId: string, studentId: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  await prisma.studentCharge.update({
    where: { id: chargeId },
    data: { endDate: new Date() },
  });
  await recordAudit({
    entityType: "StudentCharge",
    entityId: chargeId,
    action: "STATUS_CHANGE",
    actor,
    changes: { ended: true },
  });
  revalidateStudentPaths(studentId);
}

// Removes a charge definition — never touches any Payment row it already
// generated, since each month's row is already its own independent
// record (same principle as deleteExpense/every other cleanup action in
// this system).
export async function deleteStudentCharge(chargeId: string, studentId: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  await recordAudit({
    entityType: "StudentCharge",
    entityId: chargeId,
    action: "DELETE",
    actor,
  });
  await prisma.studentCharge.delete({ where: { id: chargeId } });
  revalidateStudentPaths(studentId);
}
