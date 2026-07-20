import { prisma } from "@/lib/prisma";
import { createAdminClient, generateTempPassword } from "@/lib/supabase/admin";
import type { Role } from "@prisma/client";

// Creates the Supabase Auth identity + mirrored Prisma User row for a new
// teacher/student/coordinator/admin. Returns the temporary password so the
// caller can display it once to the admin (no SMTP is configured in this
// environment, so email invites aren't sent automatically).
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
