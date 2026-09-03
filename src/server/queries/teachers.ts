import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { resolveHistoricalAmount } from "@/server/billing";
import type { LessonStatus } from "@prisma/client";

// A class "happened" in some recorded sense if it's OK (dada), NC (não
// compareceu) or R (reposição) — as opposed to still SCHEDULED or one of
// the cancellation codes, which never occurred.
const REALIZED_STATUSES = ["COMPLETED", "NO_SHOW", "MAKEUP"] as const;

// Statuses that mean a scheduled class definitely won't be taught/paid —
// excluded even from the "previsto" (forecast) total, since it's already
// known those hours won't happen.
const PREVISTO_EXCLUDED_STATUSES: LessonStatus[] = [
  "CANCELED_BY_STUDENT",
  "CANCELED_BY_TEACHER",
  "CANCELED_VACATION",
  "CANCELED_HOLIDAY",
  "PAUSED",
];

// Per-teacher payroll for a given month — "previsto" is every class on
// their calendar that month that isn't already a known cancellation (so it
// includes both future SCHEDULED classes and ones already given), priced
// at their hourly rate for that month (resolved from hourlyRateHistory).
// "realizado" is the same but only for classes actually given so far
// (COMPLETED/NO_SHOW/MAKEUP) — grows live as teachers report their
// lessons, same rule as "Horas trabalhadas (mês)" on the teacher detail
// page. Used for the "Professores" box on the Gastos page instead of a
// manually-entered expense, since teacher pay is derived, not typed in.
export async function getTeacherPayrollForMonth(year: number, month: number) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const [teachers, lessonsByTeacher] = await Promise.all([
    prisma.teacherProfile.findMany({
      where: { user: { active: true } },
      include: { user: true },
    }),
    prisma.lesson.groupBy({
      by: ["teacherId", "status"],
      where: { scheduledAt: { gte: monthStart, lte: monthEnd } },
      _sum: { durationMin: true },
    }),
  ]);

  const rows = teachers.map((t) => {
    const hourlyRate = resolveHistoricalAmount(t.hourlyRate, t.hourlyRateHistory, monthStart);
    let previstoMinutes = 0;
    let realizadoMinutes = 0;
    for (const g of lessonsByTeacher) {
      if (g.teacherId !== t.id) continue;
      const minutes = g._sum.durationMin ?? 0;
      if (!PREVISTO_EXCLUDED_STATUSES.includes(g.status)) previstoMinutes += minutes;
      if ((REALIZED_STATUSES as readonly string[]).includes(g.status)) realizadoMinutes += minutes;
    }
    return {
      teacherId: t.id,
      teacherName: t.user.name,
      previsto: (previstoMinutes / 60) * hourlyRate,
      realizado: (realizadoMinutes / 60) * hourlyRate,
    };
  });

  rows.sort((a, b) => b.previsto - a.previsto);
  const totals = rows.reduce(
    (acc, r) => ({ previsto: acc.previsto + r.previsto, realizado: acc.realizado + r.realizado }),
    { previsto: 0, realizado: 0 }
  );

  return { rows, totals };
}

export async function listTeachers() {
  // Includes inactive teachers too (not just active) so admins can find and
  // reactivate them from the same list instead of only via Usuários.
  const teachers = await prisma.teacherProfile.findMany({
    include: { user: true, students: true },
    orderBy: [{ user: { active: "desc" } }, { user: { name: "asc" } }],
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return Promise.all(
    teachers.map(async (t) => {
      // "Esperadas" — how many classes their current active students are
      // contracted for this month. "Realizadas" — how many actually
      // happened (OK/NC/R), whichever is lower or higher depending on the
      // month, since either can vary independently.
      const activeStudentsList = t.students.filter((s) => s.status === "ACTIVE");
      const expectedLessonsThisMonth = activeStudentsList.reduce(
        (sum, s) => sum + s.lessonsPerMonth,
        0
      );
      const actualLessonsThisMonth = await prisma.lesson.count({
        where: {
          teacherId: t.id,
          scheduledAt: { gte: monthStart, lte: monthEnd },
          status: { in: [...REALIZED_STATUSES] },
        },
      });
      return {
        ...t,
        expectedLessonsThisMonth,
        actualLessonsThisMonth,
        activeStudents: activeStudentsList.length,
      };
    })
  );
}

export async function getTeacherDetail(teacherId: string) {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      user: true,
      students: { include: { user: true } },
      lessons: { orderBy: { scheduledAt: "desc" }, take: 50 },
    },
  });
  if (!teacher) return null;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const todayLessons = await prisma.lesson.count({
    where: { teacherId, scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) } },
  });
  const completedTotal = await prisma.lesson.count({
    where: { teacherId, status: "COMPLETED" },
  });

  const statusBreakdown = await prisma.lesson.groupBy({
    by: ["status"],
    where: { teacherId, scheduledAt: { gte: monthStart, lte: monthEnd } },
    _count: { _all: true },
    _sum: { durationMin: true },
  });
  const countByStatus = new Map(statusBreakdown.map((g) => [g.status, g._count._all]));
  const actualLessonsThisMonth = REALIZED_STATUSES.reduce(
    (sum, status) => sum + (countByStatus.get(status) ?? 0),
    0
  );
  const canceledByStudentThisMonth = countByStatus.get("CANCELED_BY_STUDENT") ?? 0;
  const canceledByTeacherThisMonth = countByStatus.get("CANCELED_BY_TEACHER") ?? 0;
  const makeupThisMonth = countByStatus.get("MAKEUP") ?? 0;
  // Minutes come from each lesson's durationMin, which is itself derived
  // from the student's registered lesson schedule (start/end time) when
  // the lesson was generated — so this already reflects real class times,
  // not a flat per-lesson assumption.
  const minutesTaughtThisMonth = statusBreakdown
    .filter((g) => (REALIZED_STATUSES as readonly string[]).includes(g.status))
    .reduce((sum, g) => sum + (g._sum.durationMin ?? 0), 0);

  const expectedLessonsThisMonth = teacher.students
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + s.lessonsPerMonth, 0);

  return {
    ...teacher,
    todayLessons,
    completedTotal,
    actualLessonsThisMonth,
    expectedLessonsThisMonth,
    canceledByStudentThisMonth,
    canceledByTeacherThisMonth,
    makeupThisMonth,
    hoursTaughtThisMonth: minutesTaughtThisMonth / 60,
  };
}
