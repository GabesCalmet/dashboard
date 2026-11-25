import { prisma } from "@/lib/prisma";
import { startOfYear } from "date-fns";
import { brazilToday } from "@/lib/timezone";

// Jan 1 through today, not a trailing window — a stat that resets every
// January, same as how a school year/matrícula naturally resets, rather
// than always showing "the last 6 months" regardless of the calendar.
export async function getStudentStats(studentId: string) {
  const now = brazilToday();
  const yearStart = startOfYear(now);

  const lessons = await prisma.lesson.findMany({
    where: { studentId, scheduledAt: { gte: yearStart, lte: now } },
  });
  const completed = lessons.filter((l) => l.status === "COMPLETED");
  const canceled = lessons.filter((l) =>
    [
      "CANCELED_BY_STUDENT",
      "CANCELED_BY_STUDENT_NO_MAKEUP",
      "CANCELED_BY_TEACHER",
      "CANCELED_LATE",
      "CANCELED_HOLIDAY",
      "NO_SHOW",
    ].includes(l.status)
  );
  const makeups = lessons.filter((l) => l.status === "MAKEUP");

  const totals = {
    aulas: completed.length,
    horas: Number((completed.reduce((acc, l) => acc + l.durationMin, 0) / 60).toFixed(1)),
    cancelamentos: canceled.length,
    reposicoes: makeups.length,
  };

  const totalScheduled = await prisma.lesson.count({
    where: { studentId, status: { not: "SCHEDULED" } },
  });
  const totalCompleted = await prisma.lesson.count({ where: { studentId, status: "COMPLETED" } });
  const attendanceRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  return { totals, attendanceRate };
}
