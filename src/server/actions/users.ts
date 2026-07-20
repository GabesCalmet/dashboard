"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionUserAccount, deactivateUserAccount } from "@/server/accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/server/audit";
import type { ActionState } from "@/server/actions/students";

const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "COORDINATOR"]),
});

export async function createStaffUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = staffSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  try {
    const { user, tempPassword } = await provisionUserAccount(data);
    await recordAudit({
      entityType: "User",
      entityId: user.id,
      action: "CREATE",
      actor,
      changes: { role: data.role },
    });
    revalidatePath("/admin/users");
    return { success: "Usuário criado com sucesso.", tempPassword };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar usuário." };
  }
}

export async function toggleUserActive(userId: string, active: boolean) {
  const actor = await requireRole("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { active } });
  // Keep the Supabase Auth ban in sync with our own active flag so
  // reactivating a user here actually restores their ability to log in.
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h",
  });
  await recordAudit({
    entityType: "User",
    entityId: userId,
    action: "STATUS_CHANGE",
    actor,
    changes: { active },
  });
  revalidatePath("/admin/users");
}

export async function deleteUserAccount(userId: string) {
  const actor = await requireRole("ADMIN");
  if (userId === actor.id) throw new Error("Você não pode excluir seu próprio usuário.");
  await recordAudit({
    entityType: "User",
    entityId: userId,
    action: "DELETE",
    actor,
  });
  await deactivateUserAccount(userId);
  revalidatePath("/admin/users");
}
