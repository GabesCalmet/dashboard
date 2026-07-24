import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRecurringLessons } from "@/server/lessons/recurring";

// Recurring lessons are only generated ~12 weeks ahead at a time (created
// or edited). Without this, the window would stop advancing for students
// nobody has edited in a while. Intended to run weekly via an external
// scheduler (Vercel Cron, Supabase pg_cron, etc.) with
// `Authorization: Bearer ${CRON_SECRET}` — same pattern as
// /api/cron/lesson-reminders.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await prisma.studentProfile.findMany({
    where: { status: "ACTIVE", teacherId: { not: null } },
    select: { id: true },
  });

  for (const student of students) {
    await syncRecurringLessons(student.id);
  }

  return NextResponse.json({ ok: true, synced: students.length });
}
