import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function getTeacherDashboardData(teacherId: string) {
  const now = new Date();

  const [totalStudents, activeStudents, todayLessons, upcomingLessons, completedLessons] =
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
      prisma.lesson.count({ where: { teacherId, status: "COMPLETED" } }),
    ]);

  return {
    totalStudents,
    activeStudents,
    todayLessons,
    upcomingLessons,
    completedLessons,
  };
}
