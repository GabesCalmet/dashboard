import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { lessonStatusCalendarStyle, lessonStatusDisplayLabel } from "@/lib/labels";
import type { Prisma } from "@prisma/client";

type BlockedSlot = {
  weekday: number;
  start: string;
  end?: string;
  from?: string;
  until?: string;
  tipo?: string;
  observacoes?: string;
};

function parseBlockedSlots(value: unknown): BlockedSlot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is BlockedSlot =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).weekday === "number"
    )
    .map((e) => ({
      weekday: e.weekday,
      start: typeof e.start === "string" ? e.start : "",
      end: typeof e.end === "string" && e.end ? e.end : undefined,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
      tipo: typeof e.tipo === "string" && e.tipo ? e.tipo : undefined,
      observacoes: typeof e.observacoes === "string" && e.observacoes ? e.observacoes : undefined,
    }));
}

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

  // A teacher's own recurring "blocked" windows, rendered as a shaded
  // background on their own Agenda only — visual-only for now, so this is
  // just a FullCalendar recurring background event per block, not a real
  // Lesson row.
  const blockedEvents =
    user.role === "TEACHER" && user.teacherProfile
      ? parseBlockedSlots(user.teacherProfile.blockedSlots).map((b, i) => ({
          id: `blocked-${i}`,
          daysOfWeek: [b.weekday],
          startTime: b.start,
          // No end time yet means "open-ended for the rest of the day" —
          // a block only has a start until someone opens it from the
          // calendar and sets an end.
          endTime: b.end ?? "23:59",
          startRecur: b.from,
          endRecur: b.until,
          display: "background",
          backgroundColor: "#d64545",
          extendedProps: {
            blocked: true,
            blockIndex: i,
            weekday: b.weekday,
            start: b.start,
            end: b.end ?? null,
            from: b.from ?? null,
            until: b.until ?? null,
            tipo: b.tipo ?? null,
            observacoes: b.observacoes ?? null,
          },
        }))
      : [];

  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      rescheduledTo: { select: { id: true, scheduledAt: true, durationMin: true, status: true } },
      rescheduledFrom: { select: { id: true, scheduledAt: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });

  const events = lessons.map((l) => {
    const style = lessonStatusCalendarStyle[l.status];
    return {
      id: l.id,
      title: `${l.student.user.name} — ${l.teacher.user.name}`,
      start: l.scheduledAt.toISOString(),
      end: new Date(l.scheduledAt.getTime() + l.durationMin * 60000).toISOString(),
      backgroundColor: style.background,
      borderColor: style.border,
      textColor: style.text,
      extendedProps: {
        studentId: l.studentId,
        studentName: l.student.user.name,
        teacherId: l.teacherId,
        teacherName: l.teacher.user.name,
        status: l.status,
        statusLabel: lessonStatusDisplayLabel(l.status, l.isMakeup),
        isMakeup: l.isMakeup,
        durationMin: l.durationMin,
        contentTaught: l.contentTaught,
        classFocus: l.classFocus,
        homework: l.homework,
        observations: l.observations,
        meetLink: l.student.meetLink,
        rescheduledTo: l.rescheduledTo.map((r) => ({
          id: r.id,
          scheduledAt: r.scheduledAt.toISOString(),
          durationMin: r.durationMin,
          status: r.status,
        })),
        rescheduledFrom: l.rescheduledFrom
          ? { id: l.rescheduledFrom.id, scheduledAt: l.rescheduledFrom.scheduledAt.toISOString() }
          : null,
      },
    };
  });

  return NextResponse.json({ events: [...events, ...blockedEvents] });
}
