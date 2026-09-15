"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { getTeacherPayrollDetail } from "@/server/queries/teachers";
import { getPartnerSplitForMonth } from "@/server/queries/financial";

function revalidatePayoutPaths(teacherId?: string) {
  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/gastos");
  revalidatePath("/admin/financial/gastos/parceiros");
  revalidatePath("/admin/financial/gastos/professores");
  if (teacherId) revalidatePath(`/admin/financial/gastos/professores/${teacherId}`);
}

// Marks a teacher's payroll for one month as actually paid — locks in
// that month's previsto figure as the paid amount (see
// getTeacherPayrollDetail), so it stays stable even if the underlying
// data changes afterward. This is what makes it count as a real "gasto"
// (Gasto efetuado, Em caixa, the Gastos page's Professores Realizado
// box) — classes given but not yet marked paid don't. Doesn't touch the
// teacher's own payroll view or Férias, both still accrual-based.
export async function markTeacherPayoutPaid(teacherId: string, year: number, month: number) {
  const actor = await requireRole("ADMIN");

  const existing = await prisma.payout.findFirst({ where: { kind: "TEACHER", teacherId, year, month } });
  if (existing) return;

  const detail = await getTeacherPayrollDetail(teacherId, year, month);
  if (!detail) throw new Error("Professor não encontrado.");

  await prisma.payout.create({
    data: { kind: "TEACHER", teacherId, year, month, amount: detail.totals.previsto },
  });

  await recordAudit({
    entityType: "Payout",
    entityId: teacherId,
    action: "CREATE",
    actor,
    changes: { kind: "TEACHER", year, month, amount: detail.totals.previsto },
  });

  revalidatePayoutPaths(teacherId);
}

// Undoes a mistaken "marcar como pago" — the month goes back to not
// counting as a gasto until marked again.
export async function unmarkTeacherPayoutPaid(teacherId: string, year: number, month: number) {
  const actor = await requireRole("ADMIN");
  const existing = await prisma.payout.findFirst({ where: { kind: "TEACHER", teacherId, year, month } });
  if (!existing) return;

  await prisma.payout.delete({ where: { id: existing.id } });

  await recordAudit({
    entityType: "Payout",
    entityId: teacherId,
    action: "DELETE",
    actor,
    changes: { kind: "TEACHER", year, month },
  });

  revalidatePayoutPaths(teacherId);
}

type PartnerKind = "PARTNER_JOE" | "PARTNER_GABRIEL";

// Same idea as markTeacherPayoutPaid, for one partner's (Joe/Gabriel)
// share of a given month — locks in that month's previsto split.
export async function markPartnerPayoutPaid(kind: PartnerKind, year: number, month: number) {
  const actor = await requireRole("ADMIN");

  const existing = await prisma.payout.findFirst({ where: { kind, teacherId: null, year, month } });
  if (existing) return;

  const split = await getPartnerSplitForMonth(year, month);
  const amount = kind === "PARTNER_JOE" ? split.previsto.joe : split.previsto.gabriel;

  await prisma.payout.create({ data: { kind, year, month, amount } });

  await recordAudit({
    entityType: "Payout",
    entityId: kind,
    action: "CREATE",
    actor,
    changes: { kind, year, month, amount },
  });

  revalidatePayoutPaths();
}

export async function unmarkPartnerPayoutPaid(kind: PartnerKind, year: number, month: number) {
  const actor = await requireRole("ADMIN");
  const existing = await prisma.payout.findFirst({ where: { kind, teacherId: null, year, month } });
  if (!existing) return;

  await prisma.payout.delete({ where: { id: existing.id } });

  await recordAudit({
    entityType: "Payout",
    entityId: kind,
    action: "DELETE",
    actor,
    changes: { kind, year, month },
  });

  revalidatePayoutPaths();
}
