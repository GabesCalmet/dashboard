import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SessionUser = Awaited<ReturnType<typeof getCurrentUser>>;

// The user id here comes from middleware (src/lib/supabase/middleware.ts),
// which already verified the session with Supabase's auth server for this
// exact request. Reusing that instead of calling auth.getUser() again here
// saves a second network round-trip to Supabase on every page/action.
export const getCurrentUser = cache(async () => {
  const headerList = await headers();
  const userId = headerList.get("x-user-id");
  if (!userId) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { teacherProfile: true, studentProfile: true },
  });
  if (!dbUser) return null;

  // A "grupo" member has no studentProfile of their own — their login
  // shares the group's, reached via StudentGroupMember instead of the
  // ordinary 1:1 User.studentProfile relation. Once resolved here, every
  // downstream student page/action just reads user.studentProfile as
  // usual and doesn't need to know a group is involved at all.
  if (!dbUser.studentProfile && dbUser.role === "STUDENT") {
    const membership = await prisma.studentGroupMember.findUnique({
      where: { userId },
      include: { studentProfile: true },
    });
    if (membership) {
      return { ...dbUser, studentProfile: membership.studentProfile };
    }
  }

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
