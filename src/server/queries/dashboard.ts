import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getAdminDashboardData() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    totalStudents,
    activeStudents,
    canceledStudents,
    totalTeachers,
    lessonsThisMonth,
    cancellationsThisMonth,
    makeupsThisMonth,
    monthlyRevenue,
    annualRevenue,
    completedLessonsAgg,
  ] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
    prisma.studentProfile.count({ where: { status: "CANCELED" } }),
    prisma.teacherProfile.count(),
    prisma.lesson.count({
      where: { scheduledAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
    }),
    prisma.lesson.count({
      where: {
        scheduledAt: { gte: monthStart, lte: monthEnd },
        status: { in: ["CANCELED_BY_STUDENT", "CANCELED_BY_TEACHER", "CANCELED_HOLIDAY", "NO_SHOW"] },
      },
    }),
    prisma.lesson.count({
      where: { scheduledAt: { gte: monthStart, lte: monthEnd }, status: "MAKEUP" },
    }),
    prisma.payment.aggregate({
      where: { referenceMonth: monthStart, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { referenceMonth: { gte: yearStart }, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.lesson.aggregate({
      where: { scheduledAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
      _sum: { durationMin: true },
    }),
  ]);

  const avgTicket =
    activeStudents > 0
      ? (await prisma.studentProfile.aggregate({
          where: { status: "ACTIVE" },
          _avg: { monthlyValue: true },
        }))._avg.monthlyValue ?? 0
      : 0;

  const avgLessonsPerStudent =
    activeStudents > 0
      ? (await prisma.studentProfile.aggregate({
          where: { status: "ACTIVE" },
          _avg: { lessonsPerMonth: true },
        }))._avg.lessonsPerMonth ?? 0
      : 0;

  const monthlyBuckets = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMM") };
  });

  const growth = await Promise.all(
    monthlyBuckets.map(async (b) => {
      const [lessons, revenue] = await Promise.all([
        prisma.lesson.count({
          where: { scheduledAt: { gte: b.start, lte: b.end }, status: "COMPLETED" },
        }),
        prisma.payment.aggregate({
          where: { referenceMonth: b.start, status: "PAID" },
          _sum: { amount: true },
        }),
      ]);
      return {
        month: b.label,
        aulas: lessons,
        receita: Number(revenue._sum.amount ?? 0),
      };
    })
  );

  return {
    totalStudents,
    activeStudents,
    canceledStudents,
    totalTeachers,
    lessonsThisMonth,
    cancellationsThisMonth,
    makeupsThisMonth,
    monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
    annualRevenue: Number(annualRevenue._sum.amount ?? 0),
    avgTicket: Number(avgTicket),
    avgLessonsPerStudent: Number(avgLessonsPerStudent),
    hoursTaught: Math.round((completedLessonsAgg._sum.durationMin ?? 0) / 60),
    growth,
  };
}
