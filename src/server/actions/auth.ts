"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!email || !password) {
    return { error: "Informe email e senha." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Credenciais inválidas. Verifique seu email e senha." };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: data.user.id } });

  if (!dbUser || !dbUser.active) {
    await supabase.auth.signOut();
    return { error: "Usuário sem acesso ao sistema. Contate o administrador." };
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { lastLoginAt: new Date() },
  });

  redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : roleHome(dbUser.role));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
