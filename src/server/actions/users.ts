"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  provisionUserAccount,
  deactivateUserAccount,
  hardDeleteUserAccount,
  setUsernameAccountPassword,
  decryptStoredPassword,
} from "@/server/accounts";
import { createAdminClient, generateTempPassword } from "@/lib/supabase/admin";
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

export async function resetUserPassword(userId: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Coordinators can reset student/teacher passwords (matches their
  // "cadastrar/editar alunos" permissions) but not admin/coordinator ones.
  if (actor.role === "COORDINATOR" && !["STUDENT", "TEACHER"].includes(target.role)) {
    throw new Error("Você não pode redefinir a senha deste usuário.");
  }

  const newPassword = generateTempPassword();

  if (target.role === "STUDENT" || target.role === "TEACHER") {
    // Keeps the encrypted copy (shown via "Ver senha") in sync.
    await setUsernameAccountPassword(userId, newPassword);
  } else {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw new Error(error.message);
  }

  await recordAudit({
    entityType: "User",
    entityId: userId,
    action: "UPDATE",
    actor,
    changes: { action: "password_reset" },
  });

  return { login: target.username ?? target.email ?? "", password: newPassword };
}

// Lets the admin/coordinator see the current password of a STUDENT/TEACHER
// account — stored encrypted (see src/lib/crypto.ts), decrypted only here,
// server-side, never persisted to the client beyond this one response.
export async function revealCredentials(userId: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (actor.role === "COORDINATOR" && !["STUDENT", "TEACHER"].includes(target.role)) {
    throw new Error("Você não pode ver a senha deste usuário.");
  }
  if (!target.username || !target.passwordEncrypted) {
    throw new Error("Este usuário não tem login por nome de usuário.");
  }

  return { login: target.username, password: decryptStoredPassword(target.passwordEncrypted) };
}

// Lets the admin/coordinator set a specific new password for a
// STUDENT/TEACHER account (as opposed to resetUserPassword's random one).
export async function changeCredentialsPassword(userId: string, newPassword: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (actor.role === "COORDINATOR" && !["STUDENT", "TEACHER"].includes(target.role)) {
    throw new Error("Você não pode alterar a senha deste usuário.");
  }
  if (target.role !== "STUDENT" && target.role !== "TEACHER") {
    throw new Error("Esta ação é válida apenas para contas de aluno/professor.");
  }
  if (newPassword.length < 6) {
    throw new Error("A senha deve ter ao menos 6 caracteres.");
  }

  await setUsernameAccountPassword(userId, newPassword);

  await recordAudit({
    entityType: "User",
    entityId: userId,
    action: "UPDATE",
    actor,
    changes: { action: "password_changed" },
  });

  revalidatePath("/admin/users");
}

export async function deleteUserAccount(userId: string) {
  const actor = await requireRole("ADMIN");
  if (userId === actor.id) throw new Error("Você não pode excluir seu próprio usuário.");
  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  await recordAudit({
    entityType: "User",
    entityId: userId,
    action: "DELETE",
    actor,
  });

  // Teachers/students are fully erased (including their lesson/payment
  // history) — admin/coordinator staff accounts are only deactivated, kept
  // for accountability in the audit trail.
  if (target.role === "STUDENT" || target.role === "TEACHER") {
    await hardDeleteUserAccount(userId);
  } else {
    await deactivateUserAccount(userId);
  }
  revalidatePath("/admin/users");
}
