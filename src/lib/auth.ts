import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = Awaited<ReturnType<typeof getCurrentUser>>;

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { teacherProfile: true, studentProfile: true },
  });

  return dbUser;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(roleHome(user.role));
  }
  return user;
}

export function roleHome(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "COORDINATOR":
      return "/coordinator";
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
  }
}
