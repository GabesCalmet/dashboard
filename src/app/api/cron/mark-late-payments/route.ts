import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Runs daily via Vercel Cron (see vercel.json) — Vercel calls this with GET
// and, when CRON_SECRET is set, an `Authorization: Bearer ${CRON_SECRET}`
// header automatically, so no external scheduler setup is needed.
//
// A cobrança's status is only ever set once, at creation (see
// generateMonthlyPayments and the live Cobranças/Financeiro placeholders) —
// nothing else flips an already-created "Pendente" row to "Atrasado" once
// its due date passes. This sweeps every real PENDING payment whose due
// date has passed and marks it LATE, so cobranças generated ahead of time
// don't stay stuck on Pendente forever.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count } = await prisma.payment.updateMany({
    where: { status: "PENDING", dueDate: { lt: new Date() } },
    data: { status: "LATE" },
  });

  if (count > 0) {
    revalidatePath("/admin/financial");
    revalidatePath("/admin/financial/receita");
    revalidatePath("/admin/students/[id]", "page");
    revalidatePath("/coordinator/students/[id]", "page");
  }

  return NextResponse.json({ ok: true, markedLate: count });
}
