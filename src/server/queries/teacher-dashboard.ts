import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { brazilDateTime, endOfBrazilDay, toBrazilDateString } from "@/lib/timezone";
import { getTeacherPayrollDetail } from "@/server/queries/teachers";

export async function getTeacherDashboardData(
  teacherId: string,
  referenceMonth: { year: number; month: number }
) {
  const now = new Date();
  const monthDate = new Date(referenceMonth.year, referenceMonth.month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  // date-fns' startOfDay/endOfDay(now) read the server's own local time —
  // always UTC on Vercel, not Brazil time — so a class after 21:00 Brazil
  // (past UTC midnight) or before 03:00 UTC gets bucketed into the wrong
  // UTC day and either double-counted here or missing entirely relative to
  // the calendar, which already buckets by the real Brazil calendar day.
  const todayBrazilStr = toBrazilDateString(now);
  const todayStart = brazilDateTime(todayBrazilStr, "00:00");
  const todayEnd = endOfBrazilDay(new Date(todayBrazilStr));

  const [totalStudents, todayLessonsCount, upcomingLessons, completedLessonsThisMonth, previstoAgg, payroll] =
    await Promise.all([
      prisma.studentProfile.count({ where: { teacherId, status: "ACTIVE" } }),
      prisma.lesson.count({
        where: { teacherId, scheduledAt: { gte: todayStart, lte: todayEnd } },
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
      // The teacher's own payroll totals for the month — same
      // previsto/realizado figures the admin sees on Gastos, so a teacher
      // can track their own earnings without asking.
      getTeacherPayrollDetail(teacherId, referenceMonth.year, referenceMonth.month),
    ]);

  return {
    totalStudents,
    todayLessonsCount,
    upcomingLessons,
    completedLessonsThisMonth,
    previstoHoursThisMonth: (previstoAgg._sum.durationMin ?? 0) / 60,
    payrollPrevisto: payroll?.totals.previsto ?? 0,
    payrollRealizado: payroll?.totals.realizado ?? 0,
  };
}
