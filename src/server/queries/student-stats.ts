import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getStudentStats(studentId: string) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMM") };
  });

  const monthly = await Promise.all(
    buckets.map(async (b) => {
      const lessons = await prisma.lesson.findMany({
        where: { studentId, scheduledAt: { gte: b.start, lte: b.end } },
      });
      const completed = lessons.filter((l) => l.status === "COMPLETED");
      const canceled = lessons.filter((l) =>
        ["CANCELED_BY_STUDENT", "CANCELED_BY_TEACHER", "CANCELED_HOLIDAY", "NO_SHOW"].includes(l.status)
      );
      const makeups = lessons.filter((l) => l.status === "MAKEUP");
      return {
        month: b.label,
        aulas: completed.length,
        horas: Number((completed.reduce((acc, l) => acc + l.durationMin, 0) / 60).toFixed(1)),
        cancelamentos: canceled.length,
        reposicoes: makeups.length,
      };
    })
  );

  const totalScheduled = await prisma.lesson.count({
    where: { studentId, status: { not: "SCHEDULED" } },
  });
  const totalCompleted = await prisma.lesson.count({ where: { studentId, status: "COMPLETED" } });
  const attendanceRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  return { monthly, attendanceRate };
}
