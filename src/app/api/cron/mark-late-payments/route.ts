import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createMissingPaymentsForMonth } from "@/server/billing";

// Runs daily via Vercel Cron (see vercel.json) — Vercel calls this with GET
// and, when CRON_SECRET is set, an `Authorization: Bearer ${CRON_SECRET}`
// header automatically, so no external scheduler setup is needed.
//
// Two sweeps:
// 1. Auto-generates this month's cobrança for any ACTIVE student that
//    doesn't have one yet — the same "Gerar cobranças" logic an admin runs
//    by hand. Without this, a month nobody clicked "Gerar cobranças" for
//    has no real Payment row at all, so it stayed invisible to the
//    "Pagamentos atrasados" dashboard box and the Atrasados page even once
//    overdue — only the student's own Financeiro tab showed it, as a live,
//    never-persisted placeholder.
// 2. A cobrança's status is only ever set once, at creation — nothing else
//    flips an already-created "Pendente" row to "Atrasado" once its due
//    date passes. This sweeps every real PENDING payment whose due date
//    has passed and marks it LATE, so cobranças generated ahead of time
//    don't stay stuck on Pendente forever.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generated = await createMissingPaymentsForMonth(new Date());

  const { count: markedLate } = await prisma.payment.updateMany({
    where: { status: "PENDING", dueDate: { lt: new Date() } },
    data: { status: "LATE" },
  });

  if (generated > 0 || markedLate > 0) {
    revalidatePath("/admin/financial");
    revalidatePath("/admin/financial/receita");
    revalidatePath("/admin/students/[id]", "page");
    revalidatePath("/coordinator/students/[id]", "page");
  }

  return NextResponse.json({ ok: true, generated, markedLate });
}
