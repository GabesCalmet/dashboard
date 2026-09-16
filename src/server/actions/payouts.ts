"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { getPartnerSplitForMonth } from "@/server/queries/financial";
import type { BankAccount } from "@prisma/client";

function revalidatePayoutPaths(teacherId?: string) {
  revalidatePath("/admin/financial");
  revalidatePath("/admin/financial/gastos");
  revalidatePath("/admin/financial/gastos/parceiros");
  revalidatePath("/admin/financial/gastos/professores");
  if (teacherId) revalidatePath(`/admin/financial/gastos/professores/${teacherId}`);
}

// Records one payment made to a teacher for a given month. The amount,
// the actual payment date, and which account it came from are all typed
// in by hand rather than locked to the previsto forecast/today's
// date/a fixed account, so a teacher paid in installments (or paid a
// few days after the month closes, or paid from different accounts) can
// have several accurately-recorded entries — the "Realizado" figure
// shown everywhere (Gasto efetuado, Em caixa, the Gastos page's
// Professores box, this teacher's own list row) is just the sum of
// every entry for that teacher+month, and getBankBalances deducts each
// one from the account it names. Doesn't touch the teacher's own
// payroll view or Férias, both still accrual-based.
export async function addTeacherPayout(
  teacherId: string,
  year: number,
  month: number,
  amount: number,
  paidAt: Date,
  bankAccount: BankAccount
) {
  const actor = await requireRole("ADMIN");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor válido.");
  if (Number.isNaN(paidAt.getTime())) throw new Error("Informe uma data válida.");

  const payout = await prisma.payout.create({
    data: { kind: "TEACHER", teacherId, year, month, amount, paidAt, bankAccount },
  });

  await recordAudit({
    entityType: "Payout",
    entityId: payout.id,
    action: "CREATE",
    actor,
    changes: { kind: "TEACHER", teacherId, year, month, amount, paidAt: paidAt.toISOString(), bankAccount },
  });

  revalidatePayoutPaths(teacherId);
}

// Edits one already-recorded teacher payment in place — the amount,
// date, and/or account can all be corrected without deleting and
// re-adding the entry (which would lose its place in the list and
// generate a duplicate audit trail).
export async function updateTeacherPayout(
  payoutId: string,
  amount: number,
  paidAt: Date,
  bankAccount: BankAccount
) {
  const actor = await requireRole("ADMIN");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor válido.");
  if (Number.isNaN(paidAt.getTime())) throw new Error("Informe uma data válida.");

  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });

  await prisma.payout.update({
    where: { id: payoutId },
    data: { amount, paidAt, bankAccount },
  });

  await recordAudit({
    entityType: "Payout",
    entityId: payoutId,
    action: "UPDATE",
    actor,
    changes: {
      before: { amount: Number(payout.amount), paidAt: payout.paidAt, bankAccount: payout.bankAccount },
      after: { amount, paidAt: paidAt.toISOString(), bankAccount },
    },
  });

  revalidatePayoutPaths(payout.teacherId ?? undefined);
}

// Removes one payment entry — e.g. a typo'd amount.
export async function deleteTeacherPayout(payoutId: string) {
  const actor = await requireRole("ADMIN");
  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });

  await prisma.payout.delete({ where: { id: payoutId } });

  await recordAudit({
    entityType: "Payout",
    entityId: payoutId,
    action: "DELETE",
    actor,
    changes: { kind: payout.kind, teacherId: payout.teacherId, year: payout.year, month: payout.month },
  });

  revalidatePayoutPaths(payout.teacherId ?? undefined);
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
  const bankAccount: BankAccount = kind === "PARTNER_JOE" ? "JOE" : "GABES";

  await prisma.payout.create({ data: { kind, year, month, amount, bankAccount } });

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
