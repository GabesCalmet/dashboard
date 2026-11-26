"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionUsernameAccount } from "@/server/accounts";
import { recordAudit } from "@/server/audit";
import { affiliateFormSchema } from "@/lib/validation/affiliate";
import type { ActionState } from "@/server/actions/students";

export async function createAffiliate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const raw = Object.fromEntries(formData.entries());
  const parsed = affiliateFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  try {
    const { user } = await provisionUsernameAccount({
      name: data.name,
      username: data.username,
      password: data.password,
      role: "AFFILIATE",
      email: data.email || undefined,
      phone: data.phone,
    });

    const affiliate = await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        commissionPercent: data.commissionPercent,
        notes: data.notes,
      },
    });

    await recordAudit({
      entityType: "AffiliateProfile",
      entityId: affiliate.id,
      action: "CREATE",
      actor,
      changes: { name: data.name, username: data.username },
    });

    revalidatePath("/admin/affiliates");
    return { success: "Afiliado cadastrado com sucesso." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao cadastrar afiliado." };
  }
}
