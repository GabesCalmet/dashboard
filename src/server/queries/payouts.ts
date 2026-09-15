import { prisma } from "@/lib/prisma";
import type { PayoutKind } from "@prisma/client";

// The record of an actual cash payout for one month, if it's been marked
// paid — see prisma/schema.prisma's Payout model for why this exists
// (Previsto stays a live forecast; only a marked-paid month counts as a
// real "gasto").
export async function getPayout(kind: PayoutKind, teacherId: string | null, year: number, month: number) {
  return prisma.payout.findFirst({ where: { kind, teacherId, year, month } });
}

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

// Per-teacher paid total for a given month, keyed by teacherId — for the
// "Pagamento de professores" list's Realizado column.
export async function getPaidTeacherPayrollByTeacher(year: number, month: number) {
  const payouts = await prisma.payout.findMany({
    where: { kind: "TEACHER", year, month },
    select: { teacherId: true, amount: true },
  });
  const totals = new Map<string, number>();
  for (const p of payouts) {
    if (!p.teacherId) continue;
    totals.set(p.teacherId, (totals.get(p.teacherId) ?? 0) + Number(p.amount));
  }
  return totals;
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

// One partner's (Joe or Gabriel) paid amount for a month — 0 until marked.
export async function getPartnerPayoutAmount(
  kind: "PARTNER_JOE" | "PARTNER_GABRIEL",
  year: number,
  month: number
) {
  const payout = await prisma.payout.findFirst({ where: { kind, year, month } });
  return payout ? Number(payout.amount) : 0;
}
