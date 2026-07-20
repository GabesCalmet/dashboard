import { prisma } from "@/lib/prisma";

export async function listAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
}
