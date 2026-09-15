import { prisma } from "@/lib/prisma";
import type { PayoutKind } from "@prisma/client";

// The record of an actual cash payout for one month, if it's been marked
// paid — see prisma/schema.prisma's Payout model for why this exists
// (Previsto stays a live forecast; only a marked-paid month counts as a
// real "gasto").
export async function getPayout(kind: PayoutKind, teacherId: string | null, year: number, month: number) {
  return prisma.payout.findFirst({ where: { kind, teacherId, year, month } });
}

// Sum of every teacher's payout marked paid for a given month — this is
// what counts as "Professores" in Gasto efetuado/Em caixa and the Gastos
// page's Professores Realizado box, replacing the old live accrual figure.
export async function getPaidTeacherPayrollTotal(year: number, month: number) {
  const agg = await prisma.payout.aggregate({
    where: { kind: "TEACHER", year, month },
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
