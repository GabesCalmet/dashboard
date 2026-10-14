"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { expenseFormSchema } from "@/lib/validation/expense";
import type { ActionState } from "@/server/actions/students";
import type { PaymentStatus, BankAccount } from "@prisma/client";

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

// Confirms (or un-confirms) one specific month's occurrence of an expense
// — a recurring expense's months are each tracked independently (see
// ExpenseOccurrence), so marking October Pago never touches November's or
// any other month's row. paidAt defaults to right now the moment status is
// set to PAID, but an explicit value lets a late confirmation still record
// the real date the payment actually happened.
export async function setExpenseOccurrenceStatus(
  expenseId: string,
  referenceMonth: Date,
  status: PaymentStatus,
  paidAt?: Date | null
) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const resolvedPaidAt = status === "PAID" ? (paidAt ?? new Date()) : null;

  const occurrence = await prisma.expenseOccurrence.upsert({
    where: { expenseId_referenceMonth: { expenseId, referenceMonth: monthStart } },
    create: { expenseId, referenceMonth: monthStart, status, paidAt: resolvedPaidAt },
    update: { status, paidAt: resolvedPaidAt },
  });

  await recordAudit({
    entityType: "ExpenseOccurrence",
    entityId: occurrence.id,
    action: "STATUS_CHANGE",
    actor,
    changes: {
      expenseId,
      status,
      paidAt: resolvedPaidAt?.toISOString() ?? null,
      referenceMonth: monthStart.toISOString(),
    },
  });

  revalidateFinancialPaths();
  return occurrence;
}

// Directly sets this one month's charged amount for an expense — a
// one-time, this-month-only exception (a prorated/partially-refunded
// recurring bill, ...) that never changes the Expense's own flat `amount`
// (which every other month of a recurring series still reads) and has no
// effect on any other month, since each month is already its own
// independent ExpenseOccurrence row. The note is optional, unlike a
// student cobrança override — left blank when there's nothing worth
// writing down. Never touches status/paidAt.
export async function setExpenseAmountOverride(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");

  const expenseId = String(formData.get("expenseId") ?? "");
  const referenceMonthRaw = String(formData.get("referenceMonth") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!expenseId || !referenceMonthRaw || !amountRaw) {
    return { error: "Preencha todos os campos." };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Valor inválido." };
  }
  const referenceMonth = new Date(referenceMonthRaw);
  if (Number.isNaN(referenceMonth.getTime())) {
    return { error: "Data inválida." };
  }
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);

  const occurrence = await prisma.expenseOccurrence.upsert({
    where: { expenseId_referenceMonth: { expenseId, referenceMonth: monthStart } },
    create: {
      expenseId,
      referenceMonth: monthStart,
      amountOverride: amount,
      amountOverrideNote: note || null,
    },
    update: { amountOverride: amount, amountOverrideNote: note || null },
  });

  await recordAudit({
    entityType: "ExpenseOccurrence",
    entityId: occurrence.id,
    action: "UPDATE",
    actor,
    changes: { expenseId, amountOverride: amount, note: note || null, referenceMonth: monthStart.toISOString() },
  });

  revalidateFinancialPaths();
  return { success: "Valor ajustado manualmente." };
}

// Reverts a manually-overridden amount back to the expense's normal flat
// value for this one month — clears the override so the next time it's
// resolved it falls back to `amount` again. Doesn't touch status/paidAt.
export async function clearExpenseAmountOverride(expenseId: string, referenceMonth: Date) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);

  const existing = await prisma.expenseOccurrence.findUnique({
    where: { expenseId_referenceMonth: { expenseId, referenceMonth: monthStart } },
  });
  if (!existing) return;

  await prisma.expenseOccurrence.update({
    where: { id: existing.id },
    data: { amountOverride: null, amountOverrideNote: null },
  });

  await recordAudit({
    entityType: "ExpenseOccurrence",
    entityId: existing.id,
    action: "UPDATE",
    actor,
    changes: { expenseId, amountOverride: null },
  });

  revalidateFinancialPaths();
}

// Sets (or clears, with bankAccount: null) which account this one month's
// expense actually came out of — a simple, no-note, no-date, this-month-
// only exception. The Expense's own bankAccount stays the real/default
// account for every other month of a recurring series; null here just
// means "follow that default again."
export async function setExpenseBankAccountOverride(
  expenseId: string,
  referenceMonth: Date,
  bankAccount: BankAccount | null
) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);

  const occurrence = await prisma.expenseOccurrence.upsert({
    where: { expenseId_referenceMonth: { expenseId, referenceMonth: monthStart } },
    create: { expenseId, referenceMonth: monthStart, bankAccountOverride: bankAccount },
    update: { bankAccountOverride: bankAccount },
  });

  await recordAudit({
    entityType: "ExpenseOccurrence",
    entityId: occurrence.id,
    action: "UPDATE",
    actor,
    changes: { expenseId, bankAccountOverride: bankAccount, referenceMonth: monthStart.toISOString() },
  });

  revalidateFinancialPaths();
  return occurrence;
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
