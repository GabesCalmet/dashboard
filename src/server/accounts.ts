import { prisma } from "@/lib/prisma";
import { createAdminClient, generateTempPassword } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { Role } from "@prisma/client";

const USERNAME_LOGIN_DOMAIN = "login.upfront.internal";

// Supabase Auth always needs an email-shaped identifier to sign in with —
// for username-login accounts we derive one deterministically from the
// (unique) username and never show it anywhere. Real email/password login
// for ADMIN/COORDINATOR doesn't go through this at all.
export function usernameToSyntheticEmail(username: string) {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-");
  return `${slug}@${USERNAME_LOGIN_DOMAIN}`;
}

// Creates the Supabase Auth identity + mirrored Prisma User row for a new
// ADMIN/COORDINATOR account: email + password login, random temp password
// shown once (no SMTP configured in this environment, so invites aren't
// emailed automatically).
export async function provisionUserAccount(params: {
  name: string;
  email: string;
  role: Role;
  phone?: string;
}) {
  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: params.name, role: params.role },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Falha ao criar credenciais de acesso.");
  }

  try {
    const user = await prisma.user.create({
      data: {
        id: data.user.id,
        email: params.email,
        name: params.name,
        role: params.role,
        phone: params.phone,
      },
    });
    return { user, tempPassword };
  } catch (err) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw err;
  }
}

// Creates a STUDENT/TEACHER account that logs in with a username chosen by
// the admin, using a password the admin also chooses (not auto-generated).
// The password is stored encrypted so it can be shown again later from the
// admin account via decryptStoredPassword — see src/lib/crypto.ts for why
// this is encryption, not plain text, in the database.
export async function provisionUsernameAccount(params: {
  name: string;
  username: string;
  password: string;
  role: "STUDENT" | "TEACHER";
  email?: string;
  phone?: string;
}) {
  const existingUsername = await prisma.user.findUnique({ where: { username: params.username } });
  if (existingUsername) {
    throw new Error("Este nome de usuário já está em uso. Escolha outro.");
  }

  const admin = createAdminClient();
  const syntheticEmail = usernameToSyntheticEmail(params.username);

  const { data, error } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: params.password,
    email_confirm: true,
    user_metadata: { name: params.name, role: params.role, username: params.username },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Falha ao criar credenciais de acesso.");
  }

  try {
    const user = await prisma.user.create({
      data: {
        id: data.user.id,
        username: params.username,
        passwordEncrypted: encryptSecret(params.password),
        email: params.email || undefined,
        name: params.name,
        role: params.role,
        phone: params.phone,
      },
    });
    return { user };
  } catch (err) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw err;
  }
}

// Sets a new admin-chosen password for an existing username-login account.
export async function setUsernameAccountPassword(userId: string, newPassword: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(error.message);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordEncrypted: encryptSecret(newPassword) },
  });
}

export function decryptStoredPassword(passwordEncrypted: string) {
  return decryptSecret(passwordEncrypted);
}

// "Excluir" a student/teacher/staff account revokes access but never drops
// the row: lesson history, payments and audit trails all reference these
// profiles, and the portal's history requirement says records are never
// erased. Login is fully blocked (Prisma `active=false`, which the login
// action checks, plus a long Supabase Auth ban as a second layer) while the
// academic record stays intact and simply drops out of active lists.
export async function deactivateUserAccount(userId: string) {
  const admin = createAdminClient();
  await prisma.user.update({ where: { id: userId }, data: { active: false } });
  await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
}

// Permanently erases the account and everything that references it —
// lessons, payments, level history, etc. cascade-delete along with the
// StudentProfile/TeacherProfile row (see schema onDelete: Cascade). This is
// the opposite of deactivateUserAccount: nothing is recoverable afterwards,
// but it does free the username/email up for reuse immediately.
export async function hardDeleteUserAccount(userId: string) {
  const admin = createAdminClient();
  await prisma.user.delete({ where: { id: userId } });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(
      `Conta removida do sistema, mas houve um erro ao remover o login: ${error.message}. Tente novamente se o login continuar bloqueado.`
    );
  }
}
