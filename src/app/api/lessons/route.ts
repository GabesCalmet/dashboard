import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { lessonStatusColor, lessonStatusLabel } from "@/lib/labels";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ events: [] }, { status: 401 });

  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  const where: Prisma.LessonWhereInput = {};
  if (start && end) {
    where.scheduledAt = { gte: new Date(start), lte: new Date(end) };
  }

  if (user.role === "TEACHER" && user.teacherProfile) {
    where.teacherId = user.teacherProfile.id;
  } else if (user.role === "STUDENT" && user.studentProfile) {
    where.studentId = user.studentProfile.id;
  }

  const lessons = await prisma.lesson.findMany({
    where,
    include: { student: { include: { user: true } }, teacher: { include: { user: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });

  const events = lessons.map((l) => ({
    id: l.id,
    title: `${l.student.user.name} — ${l.teacher.user.name}`,
    start: l.scheduledAt.toISOString(),
    end: new Date(l.scheduledAt.getTime() + l.durationMin * 60000).toISOString(),
    color: lessonStatusColor[l.status],
    extendedProps: {
      studentId: l.studentId,
      studentName: l.student.user.name,
      teacherId: l.teacherId,
      teacherName: l.teacher.user.name,
      status: l.status,
      statusLabel: lessonStatusLabel[l.status],
      durationMin: l.durationMin,
      contentTaught: l.contentTaught,
      homework: l.homework,
      observations: l.observations,
    },
  }));

  return NextResponse.json({ events });
}
