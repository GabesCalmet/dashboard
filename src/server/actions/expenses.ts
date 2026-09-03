"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { expenseFormSchema } from "@/lib/validation/expense";
import type { ActionState } from "@/server/actions/students";

function revalidateFinancialPaths() {
  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  revalidatePath("/admin/financial/gastos");
}

export async function createExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const raw = Object.fromEntries(formData.entries());
  const parsed = expenseFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const expense = await prisma.expense.create({
    data: {
      description: data.description,
      amount: data.amount,
      frequency: data.frequency,
      category: data.category,
      date: new Date(data.date),
      dayOfMonth: data.frequency === "RECURRING" ? data.dayOfMonth : null,
      endDate: data.frequency === "RECURRING" && data.endDate ? new Date(data.endDate) : null,
      bankAccount: data.bankAccount,
      notes: data.notes || undefined,
    },
  });

  await recordAudit({
    entityType: "Expense",
    entityId: expense.id,
    action: "CREATE",
    actor,
    changes: { description: data.description, amount: data.amount, frequency: data.frequency },
  });

  revalidateFinancialPaths();
  return { success: "Gasto cadastrado com sucesso." };
}

export async function updateExpense(
  expenseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const raw = Object.fromEntries(formData.entries());
  const parsed = expenseFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      description: data.description,
      amount: data.amount,
      frequency: data.frequency,
      category: data.category,
      date: new Date(data.date),
      dayOfMonth: data.frequency === "RECURRING" ? data.dayOfMonth : null,
      endDate: data.frequency === "RECURRING" && data.endDate ? new Date(data.endDate) : null,
      bankAccount: data.bankAccount,
      notes: data.notes || undefined,
    },
  });

  await recordAudit({
    entityType: "Expense",
    entityId: expenseId,
    action: "UPDATE",
    actor,
  });

  revalidateFinancialPaths();
  return { success: "Gasto atualizado." };
}

export async function endRecurringExpense(expenseId: string) {
  const actor = await requireRole("ADMIN");
  await prisma.expense.update({
    where: { id: expenseId },
    data: { endDate: new Date() },
  });
  await recordAudit({
    entityType: "Expense",
    entityId: expenseId,
    action: "STATUS_CHANGE",
    actor,
    changes: { ended: true },
  });
  revalidateFinancialPaths();
}

export async function deleteExpense(expenseId: string) {
  const actor = await requireRole("ADMIN");
  await recordAudit({
    entityType: "Expense",
    entityId: expenseId,
    action: "DELETE",
    actor,
  });
  await prisma.expense.delete({ where: { id: expenseId } });
  revalidateFinancialPaths();
}
