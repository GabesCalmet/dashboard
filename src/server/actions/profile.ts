"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/students";

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();

  if (!name) return { error: "Informe seu nome." };

  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone: phone || null, avatarUrl: avatarUrl || undefined },
  });

  revalidatePath("/", "layout");
  return { success: "Perfil atualizado." };
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "A senha deve ter ao menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "As senhas não conferem." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: "Senha alterada com sucesso." };
}
