import { prisma } from "@/lib/prisma";

// Sum of every teacher's payout entries for a given month — this is what
// counts as "Professores" in Gasto efetuado/Em caixa and the Gastos
// page's Professores Realizado box (a teacher can have several entries
// if paid in installments; this is their total).
export async function getPaidTeacherPayrollTotal(year: number, month: number) {
  const agg = await prisma.payout.aggregate({
    where: { kind: "TEACHER", year, month },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

// Every teacher's individual payment entries for a given month, keyed by
// teacherId — the "Pagamento de professores" list shows each one
// separately (not just a lump sum) right in the Realizado column.
export async function getTeacherPayoutEntriesByTeacher(year: number, month: number) {
  const payouts = await prisma.payout.findMany({
    where: { kind: "TEACHER", year, month },
    orderBy: { paidAt: "asc" },
  });
  const byTeacher = new Map<string, typeof payouts>();
  for (const p of payouts) {
    if (!p.teacherId) continue;
    const list = byTeacher.get(p.teacherId) ?? [];
    list.push(p);
    byTeacher.set(p.teacherId, list);
  }
  return byTeacher;
}

// Every individual payment entry recorded for one teacher's month, oldest
// first — for the per-teacher breakdown page, where each can be removed.
export async function getTeacherPayoutEntries(teacherId: string, year: number, month: number) {
  return prisma.payout.findMany({
    where: { kind: "TEACHER", teacherId, year, month },
    orderBy: { paidAt: "asc" },
  });
}

// Every payout ever recorded for this teacher, across every month — the
// running "total paid to this teacher" figure on their breakdown page.
export async function getTeacherLifetimePayoutTotal(teacherId: string) {
  const agg = await prisma.payout.aggregate({
    where: { kind: "TEACHER", teacherId },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

// Sum of one partner's (Joe or Gabriel) payout entries for a month — 0
// until any are logged; a partner paid in installments can have several.
export async function getPartnerPayoutAmount(
  kind: "PARTNER_JOE" | "PARTNER_GABRIEL",
  year: number,
  month: number
) {
  const agg = await prisma.payout.aggregate({
    where: { kind, year, month },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

// Every individual payment entry recorded for one partner's month, oldest
// first — for the Parceiros page, where each can be edited or removed.
export async function getPartnerPayoutEntries(
  kind: "PARTNER_JOE" | "PARTNER_GABRIEL",
  year: number,
  month: number
) {
  return prisma.payout.findMany({
    where: { kind, year, month },
    orderBy: { paidAt: "asc" },
  });
}
