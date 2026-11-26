import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { LessonStatus } from "@prisma/client";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { brazilToday } from "@/lib/timezone";

// A group cadastro's own name, not the primary member's personal name —
// every alert below is about the shared cadastro (lessons, billing, ...)
// regardless of which member's name happens to sit on the StudentProfile's
// own User row, so "Gabi" (the primary) showing up instead of "Grupo 253"
// for a group's alert is exactly the bug this exists to avoid.
function resolveStudentDisplayName(student: { groupName: string | null; user: { name: string } }): string {
  return student.groupName ?? student.user.name;
}

// Statuses that flag a student for the attendance alert.
const FLAG_STATUSES: LessonStatus[] = [
  "CANCELED_BY_STUDENT",
  "CANCELED_BY_STUDENT_NO_MAKEUP",
  "CANCELED_BY_TEACHER",
  "NO_SHOW",
  "CANCELED_LATE",
];

// "Real" outcomes — excludes SCHEDULED (still pending, not yet an
// occurrence) so future bookings never factor into either check below.
const REPORTED_STATUSES: LessonStatus[] = [
  "COMPLETED",
  "CANCELED_BY_STUDENT",
  "CANCELED_BY_STUDENT_NO_MAKEUP",
  "NO_SHOW",
  "CANCELED_BY_TEACHER",
  "CANCELED_LATE",
  "CANCELED_VACATION",
  "CANCELED_HOLIDAY",
  "MAKEUP",
  "POWER_OUTAGE",
  "TECH_ISSUE",
  "OTHER",
];

export type AttendanceAlert = {
  studentId: string;
  studentName: string;
  teacherName: string | null;
  severity: "YELLOW" | "RED";
  reason: string;
  lessons: { id: string; scheduledAt: string; status: LessonStatus; observations: string | null }[];
  // Pendente/Aguardando resposta do professor/Ação necessária — the
  // board's three columns. Resolvido isn't a value here: resolving
  // removes the alert from this list entirely (see resolveStudentAlert).
  boardStatus: "PENDENTE" | "AGUARDANDO_RESPOSTA_PROFESSOR" | "ACAO_NECESSARIA";
};

// A student is flagged when, among lessons reported since their last
// dismissal, either: any two reported lessons back-to-back were both
// CA/CP/NC (red — stays red even if normal classes happened since; it only
// clears once the admin dismisses it), or two CA/CP/NC happened in the
// same calendar month without being back-to-back (yellow — a rough patch
// that's since resolved, as opposed to an active streak).
export async function getAttendanceAlerts(): Promise<AttendanceAlert[]> {
  const students = await prisma.studentProfile.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: true,
      teacher: { include: { user: true } },
      // rescheduledTo lets a canceled lesson that already has a
      // reagendamento booked skip the alert below — see isFlaggable.
      lessons: { orderBy: { scheduledAt: "asc" }, include: { rescheduledTo: true } },
      alertDismissals: { orderBy: { dismissedAt: "desc" }, take: 1 },
      alertActionFlag: true,
    },
  });

  // A CA/CP/NC only counts toward the alert while it's still an open
  // cancellation — once a reagendamento (makeup) has been booked for it,
  // the class is considered made up and stops flagging, whether or not
  // that makeup has actually happened yet.
  function isFlaggable(l: { status: LessonStatus; rescheduledTo: unknown[] }) {
    return FLAG_STATUSES.includes(l.status) && l.rescheduledTo.length === 0;
  }

  // Finds the most recent pair of adjacent reported lessons that were both
  // flaggable, scanning the whole list rather than only the literal last
  // two — a streak from earlier in the undismissed window still counts as
  // "two in a row" even if later classes went fine, since the point is
  // whether it ever happened, not just whether it's still the latest news.
  function findConsecutivePair<T extends { status: LessonStatus; rescheduledTo: unknown[] }>(
    lessons: T[]
  ): [T, T] | null {
    for (let i = lessons.length - 1; i >= 1; i--) {
      if (isFlaggable(lessons[i]) && isFlaggable(lessons[i - 1])) {
        return [lessons[i - 1], lessons[i]];
      }
    }
    return null;
  }

  const alerts: AttendanceAlert[] = [];

  for (const student of students) {
    const lastDismissedAt = student.alertDismissals[0]?.dismissedAt ?? null;
    const relevantLessons = student.lessons.filter(
      (l) =>
        REPORTED_STATUSES.includes(l.status) && (!lastDismissedAt || l.scheduledAt > lastDismissedAt)
    );
    if (relevantLessons.length === 0) continue;

    const consecutivePair = findConsecutivePair(relevantLessons);
    const isConsecutive = consecutivePair !== null;

    const monthGroups = new Map<
      string,
      { label: string; lessons: typeof relevantLessons }
    >();
    for (const l of relevantLessons) {
      if (!isFlaggable(l)) continue;
      const key = `${l.scheduledAt.getFullYear()}-${l.scheduledAt.getMonth()}`;
      const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
        l.scheduledAt
      );
      const entry = monthGroups.get(key) ?? { label, lessons: [] };
      entry.lessons.push(l);
      monthGroups.set(key, entry);
    }
    const triggeringMonth = [...monthGroups.values()].find((m) => m.lessons.length >= 2);

    if (!isConsecutive && !triggeringMonth) continue;

    const severity: "YELLOW" | "RED" = isConsecutive ? "RED" : "YELLOW";
    const reason = isConsecutive
      ? "2 aulas seguidas canceladas ou não compareceu"
      : `2 cancelamentos/faltas em ${triggeringMonth!.label}`;
    const flaggedLessons = isConsecutive ? consecutivePair! : triggeringMonth!.lessons;

    alerts.push({
      studentId: student.id,
      studentName: resolveStudentDisplayName(student),
      teacherName: student.teacher?.user.name ?? null,
      severity,
      reason,
      lessons: flaggedLessons.map((l) => ({
        id: l.id,
        scheduledAt: l.scheduledAt.toISOString(),
        status: l.status,
        observations: l.observations,
      })),
      boardStatus: student.alertActionFlag?.status ?? "PENDENTE",
    });
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "RED" ? -1 : 1));
}

export type TeacherRescheduleAlert = {
  studentId: string;
  studentName: string;
  lessons: { id: string; scheduledAt: string; status: LessonStatus }[];
};

// Per-teacher reminder: classes canceled by the student, canceled by the
// teacher, or lost to vacation (the same CA/CP/CF set that unlocks the
// "Reagendamento" picker — see reschedulableStatuses) that still don't have
// a makeup booked. Deliberately excludes CANCELED_HOLIDAY (feriado), which
// the rest of the system already treats as resolved with no makeup
// expected. Unlike the admin attendance alert this needs no dismiss/
// history: it clears itself the moment a reposição is booked for the
// lesson, since the query simply stops matching it.
//
// Scoped to the student's CURRENT cadastro (status ACTIVE, teacherId still
// this teacher) rather than just the lesson's own teacherId — an old
// cancellation stays on the lesson row forever, but once the student is
// reassigned to another teacher or paused/canceled it's no longer this
// teacher's to chase down.
export async function getTeacherRescheduleAlerts(teacherId: string): Promise<TeacherRescheduleAlert[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      status: { in: [...reschedulableStatuses] },
      rescheduledTo: { none: {} },
      student: { status: "ACTIVE", teacherId },
    },
    orderBy: { scheduledAt: "asc" },
    include: { student: { include: { user: true } } },
  });

  const byStudent = new Map<string, TeacherRescheduleAlert>();
  for (const l of lessons) {
    const entry = byStudent.get(l.studentId) ?? {
      studentId: l.studentId,
      studentName: resolveStudentDisplayName(l.student),
      lessons: [],
    };
    entry.lessons.push({ id: l.id, scheduledAt: l.scheduledAt.toISOString(), status: l.status });
    byStudent.set(l.studentId, entry);
  }

  return [...byStudent.values()].sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
}

// Same signal as getTeacherRescheduleAlerts, narrowed to one student — for
// the "aulas sem reposição" note on that student's own page (see
// StudentDetailView), instead of the full per-teacher dashboard list.
export async function getTeacherRescheduleAlertForStudent(
  teacherId: string,
  studentId: string
): Promise<TeacherRescheduleAlert | null> {
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      studentId,
      status: { in: [...reschedulableStatuses] },
      rescheduledTo: { none: {} },
      student: { status: "ACTIVE", teacherId },
    },
    orderBy: { scheduledAt: "asc" },
    include: { student: { include: { user: true } } },
  });
  if (lessons.length === 0) return null;

  return {
    studentId,
    studentName: resolveStudentDisplayName(lessons[0].student),
    lessons: lessons.map((l) => ({ id: l.id, scheduledAt: l.scheduledAt.toISOString(), status: l.status })),
  };
}

// Same "aulas sem reposição" note for admin/coordinator viewing a student's
// own page — unlike the teacher route, there's no logged-in teacherId to
// scope by, so this resolves the student's own CURRENT teacher first (no
// teacher assigned means nothing to chase down).
export async function getRescheduleAlertForStudent(studentId: string): Promise<TeacherRescheduleAlert | null> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { teacherId: true },
  });
  if (!student?.teacherId) return null;
  return getTeacherRescheduleAlertForStudent(student.teacherId, studentId);
}

export type TeacherMonthClosingAlert = {
  monthLabel: string;
  studentId: string;
  studentName: string;
  lessons: { id: string; scheduledAt: string }[];
};

// Reminder that only shows up in the last 3 days of the month (teachers
// are paid on the 1st) — every class that's already happened this month
// but still has no reported outcome (status still SCHEDULED), i.e. exactly
// the backlog that would throw off that month's payroll numbers once it
// closes. Empty outside that 3-day window, or once nothing is left unfilled.
export async function getTeacherMonthClosingAlert(teacherId: string): Promise<TeacherMonthClosingAlert[]> {
  const today = brazilToday();
  const daysInMonth = endOfMonth(today).getUTCDate();
  const dayOfMonth = today.getUTCDate();
  if (dayOfMonth < daysInMonth - 2) return [];

  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      status: "SCHEDULED",
      scheduledAt: { gte: startOfMonth(today), lt: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    include: { student: { include: { user: true } } },
  });
  if (lessons.length === 0) return [];

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(today);
  const byStudent = new Map<string, TeacherMonthClosingAlert>();
  for (const l of lessons) {
    const entry = byStudent.get(l.studentId) ?? {
      monthLabel,
      studentId: l.studentId,
      studentName: resolveStudentDisplayName(l.student),
      lessons: [],
    };
    entry.lessons.push({ id: l.id, scheduledAt: l.scheduledAt.toISOString() });
    byStudent.set(l.studentId, entry);
  }

  return [...byStudent.values()].sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
}

export type AlertHistoryEntry = {
  id: string;
  note: string | null;
  severity: "YELLOW" | "RED" | null;
  reason: string | null;
  lessons: { id: string; scheduledAt: string; status: LessonStatus; observations: string | null }[];
  dismissedBy: string;
  dismissedAt: string;
};

export type StudentAlertHistory = {
  studentId: string;
  studentName: string;
  entries: AlertHistoryEntry[];
};

function parseSnapshotLessons(value: unknown): AlertHistoryEntry["lessons"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .map((e) => ({
      id: typeof e.id === "string" ? e.id : "",
      scheduledAt: typeof e.scheduledAt === "string" ? e.scheduledAt : "",
      status: e.status as LessonStatus,
      observations: typeof e.observations === "string" ? e.observations : null,
    }));
}

// Every past resolved alert, grouped by student, most recent first — backs
// the "Histórico de alertas" screen so a coordinator/admin can compare a
// student's current alert against what happened before.
export async function getAlertHistory(): Promise<StudentAlertHistory[]> {
  const dismissals = await prisma.studentAlertDismissal.findMany({
    orderBy: { dismissedAt: "desc" },
    include: { student: { include: { user: true } } },
  });

  const byStudent = new Map<string, StudentAlertHistory>();
  for (const d of dismissals) {
    const entry: AlertHistoryEntry = {
      id: d.id,
      note: d.note,
      severity: d.severity === "RED" || d.severity === "YELLOW" ? d.severity : null,
      reason: d.reason,
      lessons: parseSnapshotLessons(d.lessons),
      dismissedBy: d.dismissedBy,
      dismissedAt: d.dismissedAt.toISOString(),
    };
    const existing = byStudent.get(d.studentId);
    if (existing) {
      existing.entries.push(entry);
    } else {
      byStudent.set(d.studentId, {
        studentId: d.studentId,
        studentName: resolveStudentDisplayName(d.student),
        entries: [entry],
      });
    }
  }

  return [...byStudent.values()].sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
}

export type BirthdayAlert = {
  // Unique per alert (the birthday person's own userId) — two different
  // people in the same group can each have a birthday today, and both
  // then share the same studentId (the group's), so this is what a list
  // keys on, not studentId.
  id: string;
  studentId: string;
  studentName: string;
  birthDate: Date;
  birthDateYearUnknown: boolean;
  // Age they're turning today — null whenever the birth year itself is
  // unknown (birthDate then carries DateInput's placeholder year, which
  // would make this meaningless).
  turningAge: number | null;
};

// Students (and group members, who each have their own birthDate — see
// StudentGroupMember) whose birthDate's month/day matches today —
// month/day only, the birth year never factors into whether today IS the
// birthday. birthDate is always constructed as UTC midnight of the
// intended calendar day (see formatCalendarDate's comment), so this
// compares with the UTC getters, never the server's local ones, to avoid
// an off-by-one day near midnight. ACTIVE students only — matches every
// other dashboard "who to look at today" figure; a group member's own
// alert goes through the group's shared studentId link (there's no
// separate profile page per member), gated on the group's own status
// since a member has none of its own.
export async function getBirthdayAlerts(): Promise<BirthdayAlert[]> {
  const today = brazilToday();
  const todayMonth = today.getUTCMonth();
  const todayDate = today.getUTCDate();

  const [students, groupMembers] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { status: "ACTIVE", birthDate: { not: null } },
      include: { user: true },
    }),
    prisma.studentGroupMember.findMany({
      where: { birthDate: { not: null }, studentProfile: { status: "ACTIVE" } },
      include: { user: true },
    }),
  ]);

  const fromStudents = students
    .filter((s) => s.birthDate!.getUTCMonth() === todayMonth && s.birthDate!.getUTCDate() === todayDate)
    .map((s) => ({
      id: s.userId,
      studentId: s.id,
      studentName: s.user.name,
      birthDate: s.birthDate!,
      birthDateYearUnknown: s.birthDateYearUnknown,
      turningAge: s.birthDateYearUnknown ? null : today.getUTCFullYear() - s.birthDate!.getUTCFullYear(),
    }));

  const fromGroupMembers = groupMembers
    .filter((m) => m.birthDate!.getUTCMonth() === todayMonth && m.birthDate!.getUTCDate() === todayDate)
    .map((m) => ({
      id: m.userId,
      studentId: m.studentProfileId,
      studentName: m.user.name,
      birthDate: m.birthDate!,
      birthDateYearUnknown: m.birthDateYearUnknown,
      turningAge: m.birthDateYearUnknown ? null : today.getUTCFullYear() - m.birthDate!.getUTCFullYear(),
    }));

  return [...fromStudents, ...fromGroupMembers].sort((a, b) =>
    a.studentName.localeCompare(b.studentName, "pt-BR")
  );
}
