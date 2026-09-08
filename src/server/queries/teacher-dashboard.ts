import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export async function getTeacherDashboardData(
  teacherId: string,
  referenceMonth: { year: number; month: number }
) {
  const now = new Date();
  const monthDate = new Date(referenceMonth.year, referenceMonth.month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const [totalStudents, todayLessons, upcomingLessons, completedLessonsThisMonth, previstoAgg] =
    await Promise.all([
      prisma.studentProfile.count({ where: { teacherId } }),
      prisma.lesson.findMany({
        where: { teacherId, scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        include: { student: { include: { user: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.lesson.findMany({
        where: { teacherId, scheduledAt: { gt: now }, status: "SCHEDULED" },
        include: { student: { include: { user: true } } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      prisma.lesson.count({
        where: {
          teacherId,
          status: "COMPLETED",
          scheduledAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // "Aulas previstas" — every class on the calendar that month, however
      // it turns out later (a cancellation doesn't reduce it), same
      // "assume everything is given" convention used for teacher payroll.
      prisma.lesson.aggregate({
        where: { teacherId, scheduledAt: { gte: monthStart, lte: monthEnd } },
        _sum: { durationMin: true },
      }),
    ]);

  return {
    totalStudents,
    todayLessons,
    upcomingLessons,
    completedLessonsThisMonth,
    previstoHoursThisMonth: (previstoAgg._sum.durationMin ?? 0) / 60,
  };
}
