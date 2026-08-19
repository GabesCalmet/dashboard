import { prisma } from "@/lib/prisma";
import type { LessonStatus } from "@prisma/client";

// Statuses that flag a student for the attendance alert.
const FLAG_STATUSES: LessonStatus[] = ["CANCELED_BY_STUDENT", "CANCELED_BY_TEACHER", "NO_SHOW"];

// "Real" outcomes — excludes SCHEDULED (still pending, not yet an
// occurrence) so future bookings never factor into either check below.
const REPORTED_STATUSES: LessonStatus[] = [
  "COMPLETED",
  "CANCELED_BY_STUDENT",
  "NO_SHOW",
  "CANCELED_BY_TEACHER",
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
// dismissal, either: two CA/CP/NC happened in the same calendar month
// (yellow), or the two most recent reported lessons back-to-back were both
// CA/CP/NC (red — the stronger signal wins when both apply).
export async function getAttendanceAlerts(): Promise<AttendanceAlert[]> {
  const students = await prisma.studentProfile.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: true,
      teacher: { include: { user: true } },
      lessons: { orderBy: { scheduledAt: "asc" } },
      alertDismissals: { orderBy: { dismissedAt: "desc" }, take: 1 },
    },
  });

  const alerts: AttendanceAlert[] = [];

  for (const student of students) {
    const lastDismissedAt = student.alertDismissals[0]?.dismissedAt ?? null;
    const relevantLessons = student.lessons.filter(
      (l) =>
        REPORTED_STATUSES.includes(l.status) && (!lastDismissedAt || l.scheduledAt > lastDismissedAt)
    );
    if (relevantLessons.length === 0) continue;

    const lastTwo = relevantLessons.slice(-2);
    const isConsecutive = lastTwo.length === 2 && lastTwo.every((l) => FLAG_STATUSES.includes(l.status));

    const monthGroups = new Map<
      string,
      { label: string; lessons: typeof relevantLessons }
    >();
    for (const l of relevantLessons) {
      if (!FLAG_STATUSES.includes(l.status)) continue;
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
    const flaggedLessons = isConsecutive ? lastTwo : triggeringMonth!.lessons;

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
