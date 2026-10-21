import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { brazilDateTime, brazilToday, endOfBrazilDay, toBrazilDateString } from "@/lib/timezone";
import { resolveHistoricalAmount, pickLatestOverlap } from "@/server/billing";
import { getOwnChargeAmountsForMonth } from "@/server/student-charges";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { teacherOrderIndex } from "@/lib/teacher-order";
import type { TeacherPayMode, LessonStatus } from "@prisma/client";

type TeacherHistoryEntry = {
  id: string;
  from?: string;
  until?: string;
  rate?: number;
  mode?: TeacherPayMode;
  monthlyAmount?: number;
  percentage?: number;
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
      mode: e.mode === "MONTHLY" ? "MONTHLY" : e.mode === "PERCENTAGE" ? "PERCENTAGE" : undefined,
      monthlyAmount: typeof e.monthlyAmount === "number" ? e.monthlyAmount : undefined,
      percentage: typeof e.percentage === "number" ? e.percentage : undefined,
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
  // Only set (and only meaningful) when mode is PERCENTAGE — the configured
  // percentage itself, for display; monthlyAmount already carries the
  // resolved R$ figure it works out to for this month.
  percentage: number;
  // The matched teacherHistory entry's own vigência bounds, if any —
  // narrower than the calendar month when a student switched teachers
  // mid-month. Undefined means this assignment isn't bounded by an
  // explicit history entry (the "current teacher, nothing on record"
  // fallback) — open-ended for resolveContractedLoad's purposes. Used so
  // a teacher's Contratado figure only counts real schedule occurrences
  // within their OWN slice of the month, not the whole month's worth.
  windowFrom?: Date;
  windowUntil?: Date;
};

// Resolves how a teacher is paid for a specific student/group in a given
// month — hourly (rate × hours given), a flat monthly amount, or a
// percentage of that month's own StudentCharge amount (both of the latter
// unaffected by how many classes actually happen) — from the student's
// teacherHistory entry for that teacher covering the month, if one was
// configured; else the student's current flat
// teacherPayRate/teacherPayMode/teacherMonthlyAmount/teacherPercentage, for
// a still-current assignment that's never had a change recorded; the
// teacher's own flat hourlyRate is the last-resort fallback for HOURLY, so
// payroll for a student nobody has configured a rate for yet keeps working
// exactly as it did before this feature existed. chargeOwnAmount is the
// student's own active-charge amount for this month (payerName: null;
// see getOwnChargeAmountsForMonth), pre-resolved by the caller since this
// function stays synchronous — 0 when there's no active charge that month.
function resolveTeacherAssignment(
  student: {
    teacherId: string | null;
    teacherHistory: unknown;
    teacherPayRate: unknown;
    teacherPayMode: TeacherPayMode;
    teacherMonthlyAmount: unknown;
    teacherPercentage: unknown;
    startDate: Date;
  },
  teacherId: string,
  referenceMonth: Date,
  fallbackHourlyRate: number,
  chargeOwnAmount: number
): TeacherAssignment {
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);

  const entries = parseTeacherHistory(student.teacherHistory);
  const match = pickLatestOverlap(entries, (e) => {
    if (e.id !== teacherId) return false;
    const from = e.from ? new Date(e.from) : null;
    const until = e.until ? new Date(e.until) : null;
    if (from && from > monthEnd) return false;
    if (until && until < monthStart) return false;
    return true;
  });

  // The matched entry's own vigência bounds, if any — see windowFrom/
  // windowUntil on TeacherAssignment above.
  const windowFrom = match?.from ? new Date(match.from) : undefined;
  const windowUntil = match?.until ? new Date(match.until) : undefined;

  if (match?.mode === "MONTHLY") {
    return {
      assigned: true,
      mode: "MONTHLY",
      rate: 0,
      monthlyAmount: match.monthlyAmount ?? 0,
      percentage: 0,
      windowFrom,
      windowUntil,
    };
  }
  if (match?.mode === "PERCENTAGE") {
    const percentage = match.percentage ?? 0;
    return {
      assigned: true,
      mode: "PERCENTAGE",
      rate: 0,
      monthlyAmount: (chargeOwnAmount * percentage) / 100,
      percentage,
      windowFrom,
      windowUntil,
    };
  }
  if (match && typeof match.rate === "number" && match.rate > 0) {
    return {
      assigned: true,
      mode: "HOURLY",
      rate: match.rate,
      monthlyAmount: 0,
      percentage: 0,
      windowFrom,
      windowUntil,
    };
  }
  // Before falling back to "whoever the student's teacher is right now"
  // below, check whether some OTHER teacher's history entry already
  // explicitly claims this month — if the history is complete (e.g.
  // Teacher A from Jan–Jun, Teacher B from Aug onward), a gap month like
  // July should still fall through to "current teacher" since nobody
  // explicitly covers it, but a month a different teacher's entry
  // genuinely covers (January, in that example) must never also be
  // credited to the current teacher — that's double-counting the same
  // student/month across two teachers, not an assignment gap.
  const coveredByAnotherTeacher = entries.some((e) => {
    if (e.id === teacherId) return false;
    const from = e.from ? new Date(e.from) : null;
    const until = e.until ? new Date(e.until) : null;
    if (from && from > monthEnd) return false;
    if (until && until < monthStart) return false;
    return true;
  });
  // The "current teacher" fallback below only makes sense when this
  // teacher's relationship with the student has NEVER had any history
  // logged at all — "a still-current assignment that's never had a
  // change recorded" per its own original intent. If even one entry
  // names this teacherId, their relationship IS tracked explicitly, so a
  // month none of those entries cover means exactly what the history
  // says: not yet started, or — just as often — already ended (an
  // entry with an "until" in the past, the student's raw teacherId
  // column just never got cleared when they were canceled/reassigned).
  // Either way that's a real "not assigned," not a silent gap to paper
  // over by trusting a stale current-teacher field.
  const hasHistoryForThisTeacher = entries.some((e) => e.id === teacherId);
  // A student can't have had a teacher assignment before they even
  // enrolled — but only for this "current teacher, nothing explicit on
  // record" fallback. An EXPLICIT history entry (handled above, via
  // match) is real, dated fact regardless of what startDate currently
  // says — e.g. a returning student whose startDate was moved to their
  // most recent restart, but who genuinely has an earlier, separately-
  // dated teacherHistory entry from before that (confirmed by real
  // lessons generated back then) must still resolve correctly for that
  // earlier period, not get silently zeroed out by a startDate that no
  // longer reflects when they first enrolled.
  const startOfEnrollmentMonth = new Date(student.startDate.getFullYear(), student.startDate.getMonth(), 1);
  const enrolledByThisMonth = monthEnd >= startOfEnrollmentMonth;
  if (
    !coveredByAnotherTeacher &&
    !hasHistoryForThisTeacher &&
    enrolledByThisMonth &&
    student.teacherId === teacherId
  ) {
    if (student.teacherPayMode === "MONTHLY") {
      return {
        assigned: true,
        mode: "MONTHLY",
        rate: 0,
        monthlyAmount: Number(student.teacherMonthlyAmount),
        percentage: 0,
      };
    }
    if (student.teacherPayMode === "PERCENTAGE") {
      const percentage = Number(student.teacherPercentage);
      return {
        assigned: true,
        mode: "PERCENTAGE",
        rate: 0,
        monthlyAmount: (chargeOwnAmount * percentage) / 100,
        percentage,
      };
    }
    const rate = Number(student.teacherPayRate) > 0 ? Number(student.teacherPayRate) : fallbackHourlyRate;
    return { assigned: true, mode: "HOURLY", rate, monthlyAmount: 0, percentage: 0 };
  }
  // A history entry named this teacher for the month but had no usable
  // rate/mode of its own — still a real assignment, just priced at
  // fallback, same as the pre-MONTHLY-mode behavior.
  if (match) {
    return {
      assigned: true,
      mode: "HOURLY",
      rate: fallbackHourlyRate,
      monthlyAmount: 0,
      percentage: 0,
      windowFrom,
      windowUntil,
    };
  }
  return { assigned: false, mode: "HOURLY", rate: fallbackHourlyRate, monthlyAmount: 0, percentage: 0 };
}

// MONTHLY and PERCENTAGE both resolve to a flat amount for the month,
// already computed into assignment.monthlyAmount — unaffected by how many
// lessons the student actually had, unlike HOURLY — so every place that
// handles "this assignment pays a flat fee, not per lesson" checks both.
function isFlatAssignment(mode: TeacherPayMode): boolean {
  return mode === "MONTHLY" || mode === "PERCENTAGE";
}

type LessonScheduleEntry = { weekday?: number; start: string; end: string; from?: string; until?: string };

function parseLessonScheduleEntries(lessonSchedule: unknown): LessonScheduleEntry[] {
  if (!Array.isArray(lessonSchedule)) return [];
  return lessonSchedule
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .map((e) => ({
      weekday: typeof e.weekday === "number" ? e.weekday : undefined,
      start: typeof e.start === "string" ? e.start : "",
      end: typeof e.end === "string" ? e.end : "",
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

function classDurationMinutes(e: { start: string; end: string }): number {
  const DEFAULT_MIN = 50;
  if (!e.start || !e.end) return DEFAULT_MIN;
  const [sh, sm] = e.start.split(":").map(Number);
  const [eh, em] = e.end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : DEFAULT_MIN;
}

function maxDate(...dates: (Date | null | undefined)[]): Date {
  return dates.filter((d): d is Date => !!d).reduce((a, b) => (b > a ? b : a));
}

function minDate(...dates: (Date | null | undefined)[]): Date {
  return dates.filter((d): d is Date => !!d).reduce((a, b) => (b < a ? b : a));
}

// How many times a given weekday (0=Sun..6=Sat) falls within [from, until],
// both inclusive — mirrors the exact cursor-stepping logic
// syncRecurringLessons uses to generate real lessons from a weekly
// schedule, just computed directly instead of looping week by week.
function countWeekdayOccurrences(from: Date, until: Date, weekday: number): number {
  if (from > until) return 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const daysUntilTarget = (weekday - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntilTarget);
  if (cursor > until) return 0;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((until.getTime() - cursor.getTime()) / DAY_MS);
  return Math.floor(diffDays / 7) + 1;
}

// How many classes/hours a student is actually contracted for in a given
// month — counted directly from the real weekly schedule (lessonSchedule),
// not approximated from lessonsPerMonth. Each schedule entry contributes
// one occurrence per real weekday it falls on, within the intersection of
// the calendar month, the teacher's OWN assignment window (narrower than
// the whole month when a student switched teachers mid-month — see
// TeacherAssignment's windowFrom/windowUntil), and the entry's own
// vigência — so a teacher is only credited with the classes that
// genuinely fall within their own slice of the month, priced at each
// entry's own class length (not a single averaged duration). Independent
// of how many lessons actually got generated/given. Shared by
// getTeacherPayrollForMonth's previstoContrato and
// getTeacherPayrollDetail's per-student "Contratado" breakdown.
function resolveContractedLoad(
  student: { lessonSchedule: unknown },
  referenceMonth: Date,
  window: { from?: Date; until?: Date } = {}
): { count: number; hours: number } {
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);
  const entries = parseLessonScheduleEntries(student.lessonSchedule);

  let count = 0;
  let hours = 0;
  for (const e of entries) {
    if (e.weekday === undefined || !e.start) continue;
    const entryFrom = e.from ? new Date(e.from) : null;
    const entryUntil = e.until ? new Date(e.until) : null;
    const rangeStart = maxDate(monthStart, window.from, entryFrom);
    const rangeEnd = minDate(monthEnd, window.until, entryUntil);
    if (rangeStart > rangeEnd) continue;
    const occurrences = countWeekdayOccurrences(rangeStart, rangeEnd, e.weekday);
    if (occurrences <= 0) continue;
    count += occurrences;
    hours += occurrences * (classDurationMinutes(e) / 60);
  }
  return { count, hours };
}

// For a MONTHLY/PERCENTAGE assignment — which has no hourly rate of its
// own, since it's priced as a flat monthly figure instead — what that
// figure works out to per hour, so "Valor/hora" shows something
// meaningful instead of R$ 0,00. Hours/month comes from the same real
// weekly-schedule counting resolveContractedLoad does.
function equivalentHourlyRate(
  monthlyAmount: number,
  lessonSchedule: unknown,
  referenceMonth: Date,
  window: { from?: Date; until?: Date } = {}
): number {
  const { hours } = resolveContractedLoad({ lessonSchedule }, referenceMonth, window);
  return hours > 0 ? monthlyAmount / hours : 0;
}

// A class "happened" in some recorded sense if it's OK (dada), NC (não
// compareceu), CT (cancelamento tarde), CASR (cancelamento aluno sem
// reposição), F (feriado) or R (reposição) — as opposed to still SCHEDULED
// or one of the other cancellation codes, which never occurred. CT, CASR
// and F count here the same as NC: not the teacher's fault the slot didn't
// happen (the slot was still held for it, or unfillable in time), so
// they're still paid for it.
const REALIZED_STATUSES = [
  "COMPLETED",
  "NO_SHOW",
  "CANCELED_LATE",
  "CANCELED_BY_STUDENT_NO_MAKEUP",
  "CANCELED_HOLIDAY",
  "MAKEUP",
] as const;

const teacherAssignmentSelect = {
  id: true,
  teacherId: true,
  teacherHistory: true,
  teacherPayRate: true,
  teacherPayMode: true,
  teacherMonthlyAmount: true,
  teacherPercentage: true,
  startDate: true,
  // Needed to resolve each student's contracted hours (real weekly
  // schedule occurrences × class length) for previstoContrato below.
  lessonSchedule: true,
} as const;

// A canceled lesson (CA/CP/CF) whose own reposição was booked into the SAME
// month it was canceled in isn't counted toward Previsto separately from
// that reposição — together they represent one class, not two, so counting
// both would double the forecast for what was really a single slot. A
// reposição booked into a DIFFERENT month leaves the original alone: it
// still counts toward this month's forecast as normal, and the reposição
// counts toward whichever month it actually landed in instead.
function isAbsorbedCancellation(
  lesson: { status: LessonStatus; rescheduledTo: { scheduledAt: Date }[] },
  monthStart: Date,
  monthEnd: Date
): boolean {
  if (!(reschedulableStatuses as readonly string[]).includes(lesson.status)) return false;
  return lesson.rescheduledTo.some((r) => r.scheduledAt >= monthStart && r.scheduledAt <= monthEnd);
}

// Same aggregate shape prisma.lesson.groupBy would produce (_count._all,
// _sum.durationMin), computed from an already-filtered lesson list instead
// — needed because isAbsorbedCancellation has to inspect each lesson's
// rescheduledTo before it can be safely grouped, which a DB-side groupBy
// can't express.
function aggregateByStatus(lessons: { status: LessonStatus; durationMin: number }[]) {
  const map = new Map<LessonStatus, { count: number; duration: number }>();
  for (const l of lessons) {
    const e = map.get(l.status) ?? { count: 0, duration: 0 };
    e.count += 1;
    e.duration += l.durationMin;
    map.set(l.status, e);
  }
  return [...map.entries()].map(([status, v]) => ({
    status,
    _count: { _all: v.count },
    _sum: { durationMin: v.duration },
  }));
}

function aggregateByStudentStatus(
  lessons: { studentId: string; status: LessonStatus; durationMin: number }[]
) {
  const map = new Map<
    string,
    { studentId: string; status: LessonStatus; count: number; duration: number }
  >();
  for (const l of lessons) {
    const key = `${l.studentId}::${l.status}`;
    const e = map.get(key) ?? { studentId: l.studentId, status: l.status, count: 0, duration: 0 };
    e.count += 1;
    e.duration += l.durationMin;
    map.set(key, e);
  }
  return [...map.values()].map((v) => ({
    studentId: v.studentId,
    status: v.status,
    _count: { _all: v.count },
    _sum: { durationMin: v.duration },
  }));
}

function groupLessonsByTeacherStudentStatus(
  lessons: { teacherId: string; studentId: string; status: LessonStatus; durationMin: number }[]
) {
  const map = new Map<
    string,
    { teacherId: string; studentId: string; status: LessonStatus; durationMin: number }
  >();
  for (const l of lessons) {
    const key = `${l.teacherId}::${l.studentId}::${l.status}`;
    const entry = map.get(key) ?? { teacherId: l.teacherId, studentId: l.studentId, status: l.status, durationMin: 0 };
    entry.durationMin += l.durationMin;
    map.set(key, entry);
  }
  return [...map.values()];
}

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

  const [teachers, lessons, assignedStudents] = await Promise.all([
    prisma.teacherProfile.findMany({
      where: { user: { active: true } },
      include: { user: true },
    }),
    prisma.lesson.findMany({
      where: { scheduledAt: { gte: monthStart, lte: monthEnd } },
      select: {
        teacherId: true,
        studentId: true,
        status: true,
        durationMin: true,
        rescheduledTo: { select: { scheduledAt: true } },
      },
    }),
    // Every currently-active student with a teacher assigned — on top of
    // the lesson-driven roster below, so a MONTHLY-fixed assignment still
    // gets paid even in a month with few/no generated lessons for it.
    prisma.studentProfile.findMany({
      where: { status: "ACTIVE", teacherId: { not: null } },
      select: teacherAssignmentSelect,
    }),
  ]);

  const lessonsByTeacherStudent = groupLessonsByTeacherStudentStatus(
    lessons.filter((l) => !isAbsorbedCancellation(l, monthStart, monthEnd))
  );

  const lessonStudentIds = [...new Set(lessons.map((l) => l.studentId))];
  const missingIds = lessonStudentIds.filter((id) => !assignedStudents.some((s) => s.id === id));
  const extraStudents = missingIds.length
    ? await prisma.studentProfile.findMany({
        where: { id: { in: missingIds } },
        select: teacherAssignmentSelect,
      })
    : [];
  const students = [...assignedStudents, ...extraStudents];
  const studentById = new Map(students.map((s) => [s.id, s]));
  const chargeOwnAmounts = await getOwnChargeAmountsForMonth(students.map((s) => s.id), monthStart);

  const rows = teachers.map((t) => {
    const fallbackHourlyRate = resolveHistoricalAmount(t.hourlyRate, t.hourlyRateHistory, monthStart);
    let previsto = 0;
    let realizado = 0;
    // What each assigned student's contract itself is worth this month —
    // real weekly-schedule occurrences × class length × rate for an
    // HOURLY assignment, the flat amount for a MONTHLY/PERCENTAGE one —
    // entirely independent of how many lessons actually got
    // generated/given, unlike previsto above. Computed for every assigned
    // student regardless of lesson activity, not just those with lessons
    // this month.
    let previstoContrato = 0;
    // Same as previstoContrato, but excluding PERCENTAGE-mode assignments
    // — a teacher paid a cut of the student's charge isn't salaried for
    // that assignment, so it doesn't contribute to their férias
    // provision, unlike an HOURLY or flat MONTHLY one. Only this field
    // feeds getTeacherFeriasForYear; previstoContrato itself is unchanged.
    let contratadoFerias = 0;
    const flatHandled = new Set<string>();

    for (const student of students) {
      const assignment = resolveTeacherAssignment(
        student,
        t.id,
        monthStart,
        fallbackHourlyRate,
        chargeOwnAmounts.get(student.id) ?? 0
      );
      if (!assignment.assigned) continue;
      if (isFlatAssignment(assignment.mode)) {
        previsto += assignment.monthlyAmount;
        realizado += assignment.monthlyAmount;
        previstoContrato += assignment.monthlyAmount;
        if (assignment.mode === "MONTHLY") contratadoFerias += assignment.monthlyAmount;
        flatHandled.add(student.id);
      } else {
        const contratoValue =
          resolveContractedLoad(student, monthStart, {
            from: assignment.windowFrom,
            until: assignment.windowUntil,
          }).hours * assignment.rate;
        previstoContrato += contratoValue;
        contratadoFerias += contratoValue;
      }
    }

    for (const g of lessonsByTeacherStudent) {
      if (g.teacherId !== t.id) continue;
      if (flatHandled.has(g.studentId)) continue;
      const student = studentById.get(g.studentId);
      if (!student) continue;
      const assignment = resolveTeacherAssignment(
        student,
        t.id,
        monthStart,
        fallbackHourlyRate,
        chargeOwnAmounts.get(student.id) ?? 0
      );
      const pay = (g.durationMin / 60) * assignment.rate;
      previsto += pay;
      if ((REALIZED_STATUSES as readonly string[]).includes(g.status)) realizado += pay;
    }
    return { teacherId: t.id, teacherName: t.user.name, previsto, realizado, previstoContrato, contratadoFerias };
  });

  rows.sort((a, b) => teacherOrderIndex(a.teacherName) - teacherOrderIndex(b.teacherName));
  const totals = rows.reduce(
    (acc, r) => ({
      previsto: acc.previsto + r.previsto,
      realizado: acc.realizado + r.realizado,
      previstoContrato: acc.previstoContrato + r.previstoContrato,
      contratadoFerias: acc.contratadoFerias + r.contratadoFerias,
    }),
    { previsto: 0, realizado: 0, previstoContrato: 0, contratadoFerias: 0 }
  );

  return { rows, totals };
}

// Férias provision — 8,3% (≈1/12) of each teacher's Contratado total
// (real weekly-schedule occurrences × class length × rate for HOURLY, the
// flat amount for MONTHLY — see contratadoFerias on
// getTeacherPayrollForMonth), which
// doesn't depend on whether classes were actually given, so there's no
// separate previsto/realizado split here anymore: one figure per month,
// the same regardless of attendance. PERCENTAGE-mode assignments are
// excluded entirely (a cut of the student's charge isn't a salaried
// assignment, so it doesn't accrue férias). "Mensal" is just the current
// month's own provision; "Anual" sums a real getTeacherPayrollForMonth
// call for every month from January through the current one — not the
// current month's rate projected backward — so a payroll that was
// smaller or larger in an earlier month is reflected accurately instead
// of assumed constant. Currently-inactive teachers who taught earlier in
// the year are missed here, same limitation as getTeacherPayrollForMonth
// itself (both only ever look at today's active roster).
export async function getTeacherFeriasForYear(year: number, throughMonth: number) {
  const months = Array.from({ length: throughMonth + 1 }, (_, m) => m);
  const monthlyPayrolls = await Promise.all(months.map((m) => getTeacherPayrollForMonth(year, m)));

  const byTeacher = new Map<string, { teacherName: string; monthlyBase: number; annualBase: number }>();
  monthlyPayrolls.forEach((payroll, i) => {
    const isCurrentMonth = i === throughMonth;
    for (const row of payroll.rows) {
      const entry = byTeacher.get(row.teacherId) ?? {
        teacherName: row.teacherName,
        monthlyBase: 0,
        annualBase: 0,
      };
      entry.annualBase += row.contratadoFerias;
      if (isCurrentMonth) entry.monthlyBase = row.contratadoFerias;
      byTeacher.set(row.teacherId, entry);
    }
  });

  const teachers = [...byTeacher.entries()]
    .map(([teacherId, t]) => ({
      teacherId,
      teacherName: t.teacherName,
      monthlyProvision: t.monthlyBase * 0.083,
      annualProvision: t.annualBase * 0.083,
    }))
    .sort((a, b) => teacherOrderIndex(a.teacherName) - teacherOrderIndex(b.teacherName));

  const totals = teachers.reduce(
    (acc, t) => ({
      monthly: acc.monthly + t.monthlyProvision,
      annual: acc.annual + t.annualProvision,
    }),
    { monthly: 0, annual: 0 }
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

  const [lessons, assignedStudents] = await Promise.all([
    prisma.lesson.findMany({
      where: { teacherId, scheduledAt: { gte: monthStart, lte: monthEnd } },
      select: {
        studentId: true,
        status: true,
        durationMin: true,
        rescheduledTo: { select: { scheduledAt: true } },
      },
    }),
    // Every active student, not just ones currently assigned to this
    // teacher — resolveTeacherAssignment below (same check
    // getTeacherPayrollForMonth already does against this same global
    // pool) is what actually decides who belongs to this teacher for the
    // month. A student whose CURRENT teacher is someone else, but whose
    // teacherHistory genuinely assigns them to this teacher for the
    // viewed month, would otherwise never be found here at all — neither
    // by current teacherId (it's someone else's) nor by a real lesson
    // (if one was never generated correctly under this teacher's id) —
    // even though the teacher-level Férias/payroll total already counts
    // them correctly via this same broader pool.
    prisma.studentProfile.findMany({ where: { status: "ACTIVE" }, include: { user: true } }),
  ]);
  const countedLessons = lessons.filter((l) => !isAbsorbedCancellation(l, monthStart, monthEnd));
  const statusBreakdown = aggregateByStatus(countedLessons);
  const studentBreakdown = aggregateByStudentStatus(countedLessons);

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
  const chargeOwnAmounts = await getOwnChargeAmountsForMonth(students.map((s) => s.id), monthStart);

  const payByStatus = new Map<string, number>();
  const byStudent = new Map<
    string,
    {
      hours: number;
      previsto: number;
      realizado: number;
      count: number;
      // Aulas/horas already given so far (REALIZED_STATUSES only) — the
      // attendance-side counterpart to "realizado", so the money figure
      // is traceable to how many classes it's actually backed by instead
      // of showing up with no context, same "count/hours" pair Previsto
      // already gets.
      realizedCount: number;
      realizedHours: number;
      rate: number;
      mode: TeacherPayMode;
      percentage: number;
      // What the real weekly schedule says this student is contracted
      // for — real occurrences this month (within this teacher's own
      // assignment window) and the hours that works out to, independent
      // of how many lessons actually got generated/given this month
      // (unlike count/hours above, which are both calendar-driven).
      contractedCount: number;
      contractedHours: number;
      contratado: number;
    }
  >();

  // Every assigned student gets seeded up front — flat-fee ones priced in
  // full immediately (regardless of lessons, as before), and now HOURLY
  // ones too, with their Contratado figures resolved right away but
  // previsto/realizado left at 0 to be filled in by real lessons below.
  // Without seeding HOURLY here, a student genuinely assigned this month
  // (per teacherHistory/cadastro) but with no lesson actually generated
  // for it — a scheduling gap, enrolled partway through, etc. — was
  // completely invisible on this page, even though getTeacherPayrollForMonth's
  // teacher-level Contratado/Férias total already counted them.
  for (const student of assignedStudents) {
    const assignment = resolveTeacherAssignment(
      student,
      teacherId,
      monthStart,
      fallbackHourlyRate,
      chargeOwnAmounts.get(student.id) ?? 0
    );
    if (!assignment.assigned) continue;
    const assignmentWindow = { from: assignment.windowFrom, until: assignment.windowUntil };
    const { count: contractedCount, hours: contractedHours } = resolveContractedLoad(
      student,
      monthStart,
      assignmentWindow
    );
    if (isFlatAssignment(assignment.mode)) {
      byStudent.set(student.id, {
        hours: 0,
        previsto: assignment.monthlyAmount,
        realizado: assignment.monthlyAmount,
        count: 0,
        realizedCount: 0,
        realizedHours: 0,
        rate: equivalentHourlyRate(
          assignment.monthlyAmount,
          student.lessonSchedule,
          monthStart,
          assignmentWindow
        ),
        mode: assignment.mode,
        percentage: assignment.percentage,
        contractedCount,
        contractedHours,
        contratado: assignment.monthlyAmount,
      });
    } else {
      byStudent.set(student.id, {
        hours: 0,
        previsto: 0,
        realizado: 0,
        count: 0,
        realizedCount: 0,
        realizedHours: 0,
        rate: assignment.rate,
        mode: "HOURLY",
        percentage: 0,
        contractedCount,
        contractedHours,
        contratado: contractedHours * assignment.rate,
      });
    }
  }

  for (const g of studentBreakdown) {
    const student = studentById.get(g.studentId);
    const assignment = student
      ? resolveTeacherAssignment(
          student,
          teacherId,
          monthStart,
          fallbackHourlyRate,
          chargeOwnAmounts.get(student.id) ?? 0
        )
      : { assigned: false, mode: "HOURLY" as const, rate: fallbackHourlyRate, monthlyAmount: 0, percentage: 0 };
    const hours = (g._sum.durationMin ?? 0) / 60;
    const isRealized = (REALIZED_STATUSES as readonly string[]).includes(g.status);
    const assignmentWindow = { from: assignment.windowFrom, until: assignment.windowUntil };

    if (isFlatAssignment(assignment.mode)) {
      // Already counted as a flat fee above — only track hours/count here,
      // for attendance context, not pay. A flat-fee student is paid in
      // full regardless of attendance, so their "realized" hours/count
      // just mirror the total — there's no partial-payment concept to
      // track separately here.
      // student is guaranteed defined here — isFlatAssignment only ever
      // true above when the ternary at this block's top resolved a real
      // assignment, which requires a real student.
      const contractedLoad = resolveContractedLoad(student!, monthStart, assignmentWindow);
      const entry = byStudent.get(g.studentId) ?? {
        hours: 0,
        previsto: assignment.monthlyAmount,
        realizado: assignment.monthlyAmount,
        count: 0,
        realizedCount: 0,
        realizedHours: 0,
        rate: equivalentHourlyRate(
          assignment.monthlyAmount,
          student!.lessonSchedule,
          monthStart,
          assignmentWindow
        ),
        mode: assignment.mode,
        percentage: assignment.percentage,
        contractedCount: contractedLoad.count,
        contractedHours: contractedLoad.hours,
        contratado: assignment.monthlyAmount,
      };
      entry.hours += hours;
      entry.count += g._count._all;
      entry.realizedHours += hours;
      entry.realizedCount += g._count._all;
      byStudent.set(g.studentId, entry);
      continue;
    }

    const rate = assignment.rate;
    const pay = hours * rate;

    payByStatus.set(g.status, (payByStatus.get(g.status) ?? 0) + pay);

    // Contratado only counts when this teacher is actually the one
    // assigned for the month (same gate getTeacherPayrollForMonth's
    // contratadoFerias applies) — a real lesson taught this month doesn't
    // by itself mean the student's contract "belongs" to this teacher,
    // e.g. a one-off substitute class while the student's real teacher
    // that month was someone else per teacherHistory. Previsto/realizado
    // below are unaffected — those are driven by the real lesson, not by
    // this assignment check.
    const contractedLoad =
      student && assignment.assigned
        ? resolveContractedLoad(student, monthStart, assignmentWindow)
        : { count: 0, hours: 0 };
    const entry = byStudent.get(g.studentId) ?? {
      hours: 0,
      previsto: 0,
      realizado: 0,
      count: 0,
      realizedCount: 0,
      realizedHours: 0,
      rate,
      mode: "HOURLY" as const,
      percentage: 0,
      contractedCount: contractedLoad.count,
      contractedHours: contractedLoad.hours,
      contratado: contractedLoad.hours * rate,
    };
    entry.count += g._count._all;
    // Previsto counts every class regardless of status — it's a forecast
    // of the full month assuming everything is given, not a running total,
    // so a cancellation doesn't shrink it. Horas follows the same rule, so
    // Horas × Valor/hora always equals Previsto on this row.
    entry.hours += hours;
    entry.previsto += pay;
    if (isRealized) {
      entry.realizado += pay;
      entry.realizedCount += g._count._all;
      entry.realizedHours += hours;
    }
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
  });
  // Active teachers first (in the fixed display order), inactive/canceled
  // ones pushed to the back (also in that order among themselves, so a
  // reactivated teacher doesn't jump to a random spot).
  teachers.sort(
    (a, b) =>
      Number(b.user.active) - Number(a.user.active) ||
      teacherOrderIndex(a.user.name) - teacherOrderIndex(b.user.name)
  );

  // Brazil's current month, not the server's own UTC month — startOfMonth
  // on a raw new Date() would silently roll over to next month every
  // evening after ~21:00 Brazil time.
  const monthStart = startOfMonth(brazilToday());
  const monthEnd = endOfMonth(brazilToday());

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

  // Brazil's current month, not the server's own UTC month — see
  // listTeachers for why startOfMonth(new Date()) miscounts.
  const monthStart = startOfMonth(brazilToday());
  const monthEnd = endOfMonth(brazilToday());

  // Brazil calendar day, not the server's own UTC day — see
  // getTeacherDashboardData for why startOfDay/endOfDay(now) miscounts.
  const todayBrazilStr = toBrazilDateString(new Date());
  const todayLessons = await prisma.lesson.count({
    where: {
      teacherId,
      scheduledAt: {
        gte: brazilDateTime(todayBrazilStr, "00:00"),
        lte: endOfBrazilDay(new Date(todayBrazilStr)),
      },
    },
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
