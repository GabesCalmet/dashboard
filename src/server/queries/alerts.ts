import { prisma } from "@/lib/prisma";
import type { LessonStatus } from "@prisma/client";

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
