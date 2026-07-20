import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getStudentDashboardData(studentId: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: { user: true, teacher: { include: { user: true } }, course: true },
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [completedTotal, completedThisMonth, nextLesson, recentLessons] = await Promise.all([
    prisma.lesson.count({ where: { studentId, status: "COMPLETED" } }),
    prisma.lesson.count({
      where: { studentId, status: "COMPLETED", scheduledAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.lesson.findFirst({
      where: { studentId, status: "SCHEDULED", scheduledAt: { gt: now } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.lesson.findMany({
      where: { studentId },
      orderBy: { scheduledAt: "desc" },
      take: 5,
      include: { teacher: { include: { user: true } } },
    }),
  ]);

  const lastObservation = recentLessons.find((l) => l.observations)?.observations ?? null;
  const pendingHomework = recentLessons.find((l) => l.homework)?.homework ?? null;
  const remainingThisMonth = Math.max(0, student.lessonsPerMonth - completedThisMonth);

  return {
    student,
    completedTotal,
    completedThisMonth,
    remainingThisMonth,
    nextLesson,
    recentLessons,
    lastObservation,
    pendingHomework,
  };
}
