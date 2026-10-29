import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { LessonStatus } from "@prisma/client";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { brazilToday } from "@/lib/timezone";

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
  lessons: { id: string; scheduledAt: string; status: LessonStatus }[];
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
      studentName: student.user.name,
      teacherName: student.teacher?.user.name ?? null,
      severity,
      reason,
      lessons: flaggedLessons.map((l) => ({
        id: l.id,
        scheduledAt: l.scheduledAt.toISOString(),
        status: l.status,
      })),
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
      studentName: l.student.user.name,
      lessons: [],
    };
    entry.lessons.push({ id: l.id, scheduledAt: l.scheduledAt.toISOString(), status: l.status });
    byStudent.set(l.studentId, entry);
  }

  return [...byStudent.values()].sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
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
      studentName: l.student.user.name,
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
  lessons: { id: string; scheduledAt: string; status: LessonStatus }[];
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
        studentName: d.student.user.name,
        entries: [entry],
      });
    }
  }

  return [...byStudent.values()].sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
}
