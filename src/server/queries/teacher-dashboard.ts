import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export async function getTeacherDashboardData(
  teacherId: string,
  referenceMonth: { year: number; month: number }
) {
  const now = new Date();
  const monthDate = new Date(referenceMonth.year, referenceMonth.month, 1);

  const [totalStudents, activeStudents, todayLessons, upcomingLessons, completedLessonsThisMonth] =
    await Promise.all([
      prisma.studentProfile.count({ where: { teacherId } }),
      prisma.studentProfile.count({ where: { teacherId, status: "ACTIVE" } }),
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
          scheduledAt: { gte: startOfMonth(monthDate), lte: endOfMonth(monthDate) },
        },
      }),
    ]);

  return {
    totalStudents,
    activeStudents,
    todayLessons,
    upcomingLessons,
    completedLessonsThisMonth,
  };
}
