import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { resolveHistoricalAmount } from "@/server/billing";
import type { TeacherPayMode } from "@prisma/client";

type TeacherHistoryEntry = {
  id: string;
  from?: string;
  until?: string;
  rate?: number;
  mode?: TeacherPayMode;
  monthlyAmount?: number;
};

function parseTeacherHistory(value: unknown): TeacherHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is Record<string, unknown> & { id: string } =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).id === "string"
    )
    .map((e) => ({
      id: e.id as string,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
      rate: typeof e.rate === "number" ? e.rate : undefined,
      mode: e.mode === "MONTHLY" ? "MONTHLY" : undefined,
      monthlyAmount: typeof e.monthlyAmount === "number" ? e.monthlyAmount : undefined,
    }));
}

type TeacherAssignment = {
  // Whether this student is actually assigned to this teacher during this
  // month at all — false means "irrelevant to this teacher's payroll",
  // distinct from an assignment that resolves to a 0 rate/amount.
  assigned: boolean;
  mode: TeacherPayMode;
  rate: number;
  monthlyAmount: number;
};

// Resolves how a teacher is paid for a specific student/group in a given
// month — hourly (rate × hours given) or a flat monthly amount
// (unaffected by how many classes actually happen) — from the student's
// teacherHistory entry for that teacher covering the month, if one was
// configured; else the student's current flat
// teacherPayRate/teacherPayMode/teacherMonthlyAmount, for a still-current
// assignment that's never had a change recorded; the teacher's own flat
// hourlyRate is the last-resort fallback for HOURLY, so payroll for a
// student nobody has configured a rate for yet keeps working exactly as
// it did before this feature existed.
function resolveTeacherAssignment(
  student: {
    teacherId: string | null;
    teacherHistory: unknown;
    teacherPayRate: unknown;
    teacherPayMode: TeacherPayMode;
    teacherMonthlyAmount: unknown;
  },
  teacherId: string,
  referenceMonth: Date,
  fallbackHourlyRate: number
): TeacherAssignment {
  const entries = parseTeacherHistory(student.teacherHistory);
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);
  const match = entries.find((e) => {
    if (e.id !== teacherId) return false;
    const from = e.from ? new Date(e.from) : null;
    const until = e.until ? new Date(e.until) : null;
    if (from && from > monthEnd) return false;
    if (until && until < monthStart) return false;
    return true;
  });

  if (match?.mode === "MONTHLY") {
    return { assigned: true, mode: "MONTHLY", rate: 0, monthlyAmount: match.monthlyAmount ?? 0 };
  }
  if (match && typeof match.rate === "number" && match.rate > 0) {
    return { assigned: true, mode: "HOURLY", rate: match.rate, monthlyAmount: 0 };
  }
  if (student.teacherId === teacherId) {
    if (student.teacherPayMode === "MONTHLY") {
      return {
        assigned: true,
        mode: "MONTHLY",
        rate: 0,
        monthlyAmount: Number(student.teacherMonthlyAmount),
      };
    }
    const rate = Number(student.teacherPayRate) > 0 ? Number(student.teacherPayRate) : fallbackHourlyRate;
    return { assigned: true, mode: "HOURLY", rate, monthlyAmount: 0 };
  }
  // A history entry named this teacher for the month but had no usable
  // rate/mode of its own — still a real assignment, just priced at
  // fallback, same as the pre-MONTHLY-mode behavior.
  if (match) {
    return { assigned: true, mode: "HOURLY", rate: fallbackHourlyRate, monthlyAmount: 0 };
  }
  return { assigned: false, mode: "HOURLY", rate: fallbackHourlyRate, monthlyAmount: 0 };
}

// A class "happened" in some recorded sense if it's OK (dada), NC (não
// compareceu), CT (cancelamento tarde), F (feriado) or R (reposição) — as
// opposed to still SCHEDULED or one of the other cancellation codes,
// which never occurred. CT and F count here the same as NC: not the
// teacher's fault the slot didn't happen, so they're still paid for it —
// a national holiday isn't discounted from their pay.
const REALIZED_STATUSES = ["COMPLETED", "NO_SHOW", "CANCELED_LATE", "CANCELED_HOLIDAY", "MAKEUP"] as const;

const teacherAssignmentSelect = {
  id: true,
  teacherId: true,
  teacherHistory: true,
  teacherPayRate: true,
  teacherPayMode: true,
  teacherMonthlyAmount: true,
} as const;

// Per-teacher payroll for a given month — "previsto" is the full amount
// supposing every class on the calendar that month is given, however it
// actually turns out later (a cancellation doesn't reduce it — it's a
// forecast of the whole month, not a running total), priced at whatever
// that teacher is paid for each specific student/group that month
// (resolveTeacherAssignment — usually configured per student/group
// cadastro instead of the teacher's own flat hourlyRate). A MONTHLY-mode
// assignment instead counts its flat amount in full, unaffected by how
// many lessons that student/group actually had — "realizado" is
// otherwise the opposite of previsto: only classes actually given so far
// (COMPLETED/NO_SHOW/CANCELED_LATE/MAKEUP) — it's what changes with
// cancellations and reposições, and grows live as teachers report their
// lessons, same rule as "Horas trabalhadas (mês)" on the teacher detail
// page. Used for the "Professores" box on the Gastos page instead of a
// manually-entered expense, since teacher pay is derived, not typed in.
export async function getTeacherPayrollForMonth(year: number, month: number) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const [teachers, lessonsByTeacherStudent, assignedStudents] = await Promise.all([
    prisma.teacherProfile.findMany({
      where: { user: { active: true } },
      include: { user: true },
    }),
    prisma.lesson.groupBy({
      by: ["teacherId", "studentId", "status"],
      where: { scheduledAt: { gte: monthStart, lte: monthEnd } },
      _sum: { durationMin: true },
    }),
    // Every currently-active student with a teacher assigned — on top of
    // the lesson-driven roster below, so a MONTHLY-fixed assignment still
    // gets paid even in a month with few/no generated lessons for it.
    prisma.studentProfile.findMany({
      where: { status: "ACTIVE", teacherId: { not: null } },
      select: teacherAssignmentSelect,
    }),
  ]);

  const lessonStudentIds = [...new Set(lessonsByTeacherStudent.map((g) => g.studentId))];
  const missingIds = lessonStudentIds.filter((id) => !assignedStudents.some((s) => s.id === id));
  const extraStudents = missingIds.length
    ? await prisma.studentProfile.findMany({
        where: { id: { in: missingIds } },
        select: teacherAssignmentSelect,
      })
    : [];
  const students = [...assignedStudents, ...extraStudents];
  const studentById = new Map(students.map((s) => [s.id, s]));

  const rows = teachers.map((t) => {
    const fallbackHourlyRate = resolveHistoricalAmount(t.hourlyRate, t.hourlyRateHistory, monthStart);
    let previsto = 0;
    let realizado = 0;
    const flatHandled = new Set<string>();

    for (const student of students) {
      const assignment = resolveTeacherAssignment(student, t.id, monthStart, fallbackHourlyRate);
      if (assignment.assigned && assignment.mode === "MONTHLY") {
        previsto += assignment.monthlyAmount;
        realizado += assignment.monthlyAmount;
        flatHandled.add(student.id);
      }
    }

    for (const g of lessonsByTeacherStudent) {
      if (g.teacherId !== t.id) continue;
      if (flatHandled.has(g.studentId)) continue;
      const student = studentById.get(g.studentId);
      if (!student) continue;
      const assignment = resolveTeacherAssignment(student, t.id, monthStart, fallbackHourlyRate);
      const pay = ((g._sum.durationMin ?? 0) / 60) * assignment.rate;
      previsto += pay;
      if ((REALIZED_STATUSES as readonly string[]).includes(g.status)) realizado += pay;
    }
    return { teacherId: t.id, teacherName: t.user.name, previsto, realizado };
  });

  rows.sort((a, b) => b.previsto - a.previsto);
  const totals = rows.reduce(
    (acc, r) => ({ previsto: acc.previsto + r.previsto, realizado: acc.realizado + r.realizado }),
    { previsto: 0, realizado: 0 }
  );

  return { rows, totals };
}

// Férias provision — 8,3% (≈1/12) of what each teacher earned, per month,
// in both flavors: previsto (assumes every class that month is given,
// same "forecast, unaffected by cancellations" convention as payroll
// previsto) and realizado (only classes actually given so far). "Mensal"
// is just the current month's own provision; "Anual" sums a real
// getTeacherPayrollForMonth call for every month from January through the
// current one — not the current month's rate projected backward — so a
// payroll that was smaller or larger in an earlier month is reflected
// accurately instead of assumed constant. Currently-inactive teachers who
// taught earlier in the year are missed here, same limitation as
// getTeacherPayrollForMonth itself (both only ever look at today's active
// roster).
export async function getTeacherFeriasForYear(year: number, throughMonth: number) {
  const months = Array.from({ length: throughMonth + 1 }, (_, m) => m);
  const monthlyPayrolls = await Promise.all(months.map((m) => getTeacherPayrollForMonth(year, m)));

  const byTeacher = new Map<
    string,
    {
      teacherName: string;
      monthlyPrevisto: number;
      monthlyRealizado: number;
      annualPrevisto: number;
      annualRealizado: number;
    }
  >();
  monthlyPayrolls.forEach((payroll, i) => {
    const isCurrentMonth = i === throughMonth;
    for (const row of payroll.rows) {
      const entry = byTeacher.get(row.teacherId) ?? {
        teacherName: row.teacherName,
        monthlyPrevisto: 0,
        monthlyRealizado: 0,
        annualPrevisto: 0,
        annualRealizado: 0,
      };
      entry.annualPrevisto += row.previsto;
      entry.annualRealizado += row.realizado;
      if (isCurrentMonth) {
        entry.monthlyPrevisto = row.previsto;
        entry.monthlyRealizado = row.realizado;
      }
      byTeacher.set(row.teacherId, entry);
    }
  });

  const teachers = [...byTeacher.entries()]
    .map(([teacherId, t]) => ({
      teacherId,
      teacherName: t.teacherName,
      monthlyProvisionPrevisto: t.monthlyPrevisto * 0.083,
      monthlyProvisionRealizado: t.monthlyRealizado * 0.083,
      annualProvisionPrevisto: t.annualPrevisto * 0.083,
      annualProvisionRealizado: t.annualRealizado * 0.083,
    }))
    .sort((a, b) => b.annualProvisionRealizado - a.annualProvisionRealizado);

  const totals = teachers.reduce(
    (acc, t) => ({
      monthlyPrevisto: acc.monthlyPrevisto + t.monthlyProvisionPrevisto,
      monthlyRealizado: acc.monthlyRealizado + t.monthlyProvisionRealizado,
      annualPrevisto: acc.annualPrevisto + t.annualProvisionPrevisto,
      annualRealizado: acc.annualRealizado + t.annualProvisionRealizado,
    }),
    { monthlyPrevisto: 0, monthlyRealizado: 0, annualPrevisto: 0, annualRealizado: 0 }
  );

  return { teachers, totals };
}

// Breaks one teacher's month down by lesson status — hours and pay per
// status group, so the previsto/realizado totals on the payroll list are
// traceable to exactly which classes make them up. Pay is resolved per
// student/group (resolveTeacherAssignment), not a single flat rate, so
// the "groups" totals are built up from the per-student breakdown rather
// than the other way around. A MONTHLY-mode student's flat fee isn't
// attributable to any one lesson status, so it's excluded from "groups"
// (which stays purely about hours/lessons per status) and only appears
// on that student's own row and in the page totals.
export async function getTeacherPayrollDetail(teacherId: string, year: number, month: number) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: { user: true },
  });
  if (!teacher) return null;

  const [statusBreakdown, studentBreakdown, assignedStudents] = await Promise.all([
    prisma.lesson.groupBy({
      by: ["status"],
      where: { teacherId, scheduledAt: { gte: monthStart, lte: monthEnd } },
      _count: { _all: true },
      _sum: { durationMin: true },
    }),
    prisma.lesson.groupBy({
      by: ["studentId", "status"],
      where: { teacherId, scheduledAt: { gte: monthStart, lte: monthEnd } },
      _count: { _all: true },
      _sum: { durationMin: true },
    }),
    // Every student currently assigned to this teacher — on top of the
    // lesson-driven roster below, so a MONTHLY-fixed assignment still
    // shows up (and gets paid) even in a month with no generated lessons.
    prisma.studentProfile.findMany({ where: { teacherId }, include: { user: true } }),
  ]);

  const fallbackHourlyRate = resolveHistoricalAmount(
    teacher.hourlyRate,
    teacher.hourlyRateHistory,
    monthStart
  );

  // Every student who has any lesson with this teacher this month — active,
  // paused, or canceled — so nobody who was actually taught (or is still on
  // the schedule) drops off just because their status changed since.
  const studentIds = [...new Set(studentBreakdown.map((g) => g.studentId))];
  const missingIds = studentIds.filter((id) => !assignedStudents.some((s) => s.id === id));
  const extraStudents = missingIds.length
    ? await prisma.studentProfile.findMany({ where: { id: { in: missingIds } }, include: { user: true } })
    : [];
  const students = [...assignedStudents, ...extraStudents];
  const studentById = new Map(students.map((s) => [s.id, s]));

  const payByStatus = new Map<string, number>();
  const byStudent = new Map<
    string,
    { hours: number; previsto: number; realizado: number; count: number; rate: number; mode: TeacherPayMode }
  >();

  // Flat-fee assignments first — count fully as previsto/realizado
  // regardless of how many lessons this teacher+student pair had this
  // month (including zero).
  for (const student of assignedStudents) {
    const assignment = resolveTeacherAssignment(student, teacherId, monthStart, fallbackHourlyRate);
    if (assignment.assigned && assignment.mode === "MONTHLY") {
      byStudent.set(student.id, {
        hours: 0,
        previsto: assignment.monthlyAmount,
        realizado: assignment.monthlyAmount,
        count: 0,
        rate: 0,
        mode: "MONTHLY",
      });
    }
  }

  for (const g of studentBreakdown) {
    const student = studentById.get(g.studentId);
    const assignment = student
      ? resolveTeacherAssignment(student, teacherId, monthStart, fallbackHourlyRate)
      : { assigned: false, mode: "HOURLY" as const, rate: fallbackHourlyRate, monthlyAmount: 0 };
    const hours = (g._sum.durationMin ?? 0) / 60;

    if (assignment.mode === "MONTHLY") {
      // Already counted as a flat fee above — only track hours/count here,
      // for attendance context, not pay.
      const entry = byStudent.get(g.studentId) ?? {
        hours: 0,
        previsto: assignment.monthlyAmount,
        realizado: assignment.monthlyAmount,
        count: 0,
        rate: 0,
        mode: "MONTHLY" as const,
      };
      entry.hours += hours;
      entry.count += g._count._all;
      byStudent.set(g.studentId, entry);
      continue;
    }

    const rate = assignment.rate;
    const pay = hours * rate;

    payByStatus.set(g.status, (payByStatus.get(g.status) ?? 0) + pay);

    const entry = byStudent.get(g.studentId) ?? {
      hours: 0,
      previsto: 0,
      realizado: 0,
      count: 0,
      rate,
      mode: "HOURLY" as const,
    };
    entry.count += g._count._all;
    // Previsto counts every class regardless of status — it's a forecast
    // of the full month assuming everything is given, not a running total,
    // so a cancellation doesn't shrink it. Horas follows the same rule, so
    // Horas × Valor/hora always equals Previsto on this row.
    entry.hours += hours;
    entry.previsto += pay;
    if ((REALIZED_STATUSES as readonly string[]).includes(g.status)) entry.realizado += pay;
    byStudent.set(g.studentId, entry);
  }

  const groups = statusBreakdown
    .filter((g) => g._count._all > 0)
    .map((g) => {
      const hours = (g._sum.durationMin ?? 0) / 60;
      return {
        status: g.status,
        count: g._count._all,
        hours,
        pay: payByStatus.get(g.status) ?? 0,
        countsAsPrevisto: true,
        countsAsRealizado: (REALIZED_STATUSES as readonly string[]).includes(g.status),
      };
    })
    .sort((a, b) => b.hours - a.hours);

  // A "grupo" cadastro should show its group name here, not the owner's
  // own name — same rule as the student detail page header.
  const studentNameById = new Map(students.map((s) => [s.id, s.groupName ?? s.user.name]));
  const studentTotals = [...byStudent.entries()]
    .map(([studentId, t]) => ({
      studentId,
      studentName: studentNameById.get(studentId) ?? "Aluno removido",
      ...t,
    }))
    .sort((a, b) => b.previsto - a.previsto);

  // Totals come from the per-student breakdown (not the per-status
  // groups) so a MONTHLY-fixed student's flat fee — which isn't
  // attributable to any one lesson status — is still counted.
  const totals = studentTotals.reduce(
    (acc, s) => ({ previsto: acc.previsto + s.previsto, realizado: acc.realizado + s.realizado }),
    { previsto: 0, realizado: 0 }
  );

  return {
    teacherId: teacher.id,
    teacherName: teacher.user.name,
    fallbackHourlyRate,
    groups,
    totals,
    students: studentTotals,
  };
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
