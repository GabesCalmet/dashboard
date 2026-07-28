"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";
import { usernameToSyntheticEmail } from "@/server/accounts";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!login || !password) {
    return { error: "Informe usuário/email e senha." };
  }

  // Students/teachers log in with a username (admin/coordinator with a real
  // email) — resolve which one this is before talking to Supabase Auth,
  // since it always needs an email-shaped identifier under the hood.
  // Usernames are stored lowercased, so match case-insensitively here.
  const usernameMatch = await prisma.user.findUnique({
    where: { username: login.toLowerCase() },
  });
  const emailForAuth = usernameMatch ? usernameToSyntheticEmail(usernameMatch.username!) : login;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailForAuth,
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
