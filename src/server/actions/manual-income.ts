"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { manualIncomeFormSchema } from "@/lib/validation/manual-income";
import type { ActionState } from "@/server/actions/students";

export async function createManualIncome(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const raw = Object.fromEntries(formData.entries());
  const parsed = manualIncomeFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const income = await prisma.manualIncome.create({
    data: {
      description: data.description,
      amount: data.amount,
      date: new Date(data.date),
      bankAccount: data.bankAccount,
      notes: data.notes || undefined,
    },
  });

  await recordAudit({
    entityType: "ManualIncome",
    entityId: income.id,
    action: "CREATE",
    actor,
    changes: { description: data.description, amount: data.amount, bankAccount: data.bankAccount },
  });

  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/receita");
  return { success: "Entrada registrada com sucesso." };
}
