import { prisma } from "@/lib/prisma";

export async function listExpenses() {
  return prisma.expense.findMany({ orderBy: { date: "desc" } });
}
