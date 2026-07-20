import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Intended to be invoked once a day by an external scheduler (Vercel Cron,
// Supabase pg_cron, GitHub Actions, etc.) with `Authorization: Bearer
// ${CRON_SECRET}`. Creates a "lesson reminder" notification for every
// student whose next scheduled lesson is within the next 24h.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const lessons = await prisma.lesson.findMany({
    where: { status: "SCHEDULED", scheduledAt: { gte: now, lte: in24h } },
    include: { student: true },
  });

  let created = 0;
  for (const lesson of lessons) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId: lesson.student.userId,
        type: "LESSON_REMINDER",
        createdAt: { gte: now },
      },
    });
    if (alreadyNotified) continue;

    await prisma.notification.create({
      data: {
        userId: lesson.student.userId,
        type: "LESSON_REMINDER",
        title: "Lembrete de aula",
        message: "Você tem uma aula agendada nas próximas 24 horas.",
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
