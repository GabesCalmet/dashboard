import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { brazilToday } from "@/lib/timezone";
import { getTotalChargeRevenueForMonth } from "@/server/student-charges";

export async function getAdminDashboardData(referenceMonth?: { year: number; month: number }) {
  // Brazil's "today", not the server's own UTC instant — defaulting to
  // new Date() would silently flip this dashboard to next month/year every
  // evening after ~21:00 Brazil time.
  const now = brazilToday();
  const viewedMonth = referenceMonth ? new Date(referenceMonth.year, referenceMonth.month, 1) : now;
  const monthStart = startOfMonth(viewedMonth);
  const monthEnd = endOfMonth(viewedMonth);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    totalStudents,
    activeStudents,
    pausedStudents,
    canceledStudents,
    totalTeachers,
    lessonsThisMonth,
    cancellationsThisMonth,
    makeupsThisMonth,
    monthlyRevenue,
    annualRevenue,
    completedLessonsAgg,
    latePaymentsCount,
  ] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
    prisma.studentProfile.count({ where: { status: "PAUSED" } }),
    prisma.studentProfile.count({ where: { status: "CANCELED" } }),
    prisma.teacherProfile.count(),
    prisma.lesson.count({
      where: { scheduledAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
    }),
    prisma.lesson.count({
      where: {
        scheduledAt: { gte: monthStart, lte: monthEnd },
        status: {
          in: [
            "CANCELED_BY_STUDENT",
            "CANCELED_BY_STUDENT_NO_MAKEUP",
            "CANCELED_BY_TEACHER",
            "CANCELED_LATE",
            "CANCELED_HOLIDAY",
            "NO_SHOW",
          ],
        },
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
    // Not scoped to the browsed month — an overdue payment from any month
    // still needs chasing down regardless of which month is on screen.
    // Only ACTIVE students, matching the Atrasados page this box links to.
    prisma.payment.count({ where: { status: "LATE", student: { status: "ACTIVE" } } }),
  ]);

  // Ticket médio = each course's real total this month (own portion +
  // whatever a third party covers on top, plus every group participant's
  // own share — see getTotalChargeRevenueForMonth), divided by how many
  // active students there are. Not the same denominator as a charge slot
  // count — a "grupo" cadastro counts once here (one StudentProfile) even
  // though it may contribute several slots to the revenue total, same
  // averaging convention this figure always used.
  const avgTicket = activeStudents > 0 ? (await getTotalChargeRevenueForMonth(monthStart)) / activeStudents : 0;

  const avgLessonsPerStudent =
    activeStudents > 0
      ? (await prisma.studentProfile.aggregate({
          where: { status: "ACTIVE" },
          _avg: { lessonsPerMonth: true },
        }))._avg.lessonsPerMonth ?? 0
      : 0;

  const monthlyBuckets = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(viewedMonth, 5 - i);
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
    pausedStudents,
    canceledStudents,
    totalTeachers,
    lessonsThisMonth,
    cancellationsThisMonth,
    makeupsThisMonth,
    monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
    annualRevenue: Number(annualRevenue._sum.amount ?? 0),
    latePaymentsCount,
    avgTicket: Number(avgTicket),
    avgLessonsPerStudent: Number(avgLessonsPerStudent),
    hoursTaught: Math.round((completedLessonsAgg._sum.durationMin ?? 0) / 60),
    growth,
  };
}
