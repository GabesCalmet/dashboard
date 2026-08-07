import { prisma } from "@/lib/prisma";

const HORIZON_WEEKS = 12;

type ScheduleEntry = { weekday: number; start: string; end: string };

function parseSchedule(value: unknown): ScheduleEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is ScheduleEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Record<string, unknown>).weekday === "number"
    )
    .map((e) => ({
      weekday: e.weekday,
      start: typeof e.start === "string" ? e.start : "",
      end: typeof e.end === "string" ? e.end : "",
    }));
}

function durationFromTimes(start: string, end: string) {
  if (!start || !end) return 50;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes : 50;
}

// Regenerates a student's recurring lessons (from their enrollment start
// date through the last class on/before the 15th of the month closing out
// the next ~HORIZON_WEEKS, or their course end date if that comes sooner)
// to match their current weekly schedule. Only ever touches lessons this
// same generator created
// (isRecurring) that are still SCHEDULED — i.e. still unconfirmed, whether
// in the past or future. Manual bookings and anything a teacher has
// already reported/marked a real outcome for (OK/CA/CP/NC/...) are never
// deleted or altered, so re-running this after enrollment is always safe.
export async function syncRecurringLessons(studentId: string) {
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student || !student.teacherId) return;

  await prisma.lesson.deleteMany({
    where: {
      studentId,
      isRecurring: true,
      status: "SCHEDULED",
    },
  });

  // Paused/cancelled students keep their history but stop generating new
  // lessons until they're active again (their next edit will regenerate).
  if (student.status !== "ACTIVE") return;

  const schedule = parseSchedule(student.lessonSchedule);
  if (schedule.length === 0) return;

  const now = new Date();
  // The earliest day to schedule from is always the enrollment start date —
  // whether that's in the past (so history gets backfilled up to today) or
  // the future (nothing generated before the student actually starts).
  const anchor = student.startDate;
  const rawHorizonEnd = new Date(
    Math.max(now.getTime(), anchor.getTime()) + HORIZON_WEEKS * 7 * 24 * 60 * 60 * 1000
  );
  // Snapped forward to the 15th of whichever month the raw ~12-week horizon
  // lands in (or the next month's 15th, if it already fell past the 15th) —
  // so the visible window always ends on the last class on/before a 15th
  // instead of stopping mid-month wherever the flat week count happens to
  // land.
  const snappedHorizonEnd =
    rawHorizonEnd.getDate() <= 15
      ? new Date(rawHorizonEnd.getFullYear(), rawHorizonEnd.getMonth(), 15, 23, 59, 59, 999)
      : new Date(rawHorizonEnd.getFullYear(), rawHorizonEnd.getMonth() + 1, 15, 23, 59, 59, 999);
  // Never schedule past the student's own course end date, if they have one.
  const horizonEnd =
    student.endDate && student.endDate < snappedHorizonEnd ? student.endDate : snappedHorizonEnd;
  const toCreate: {
    studentId: string;
    teacherId: string;
    scheduledAt: Date;
    durationMin: number;
    isRecurring: true;
  }[] = [];

  for (const entry of schedule) {
    if (!entry.start) continue;
    const [hour, minute] = entry.start.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

    const cursor = new Date(anchor);
    cursor.setHours(0, 0, 0, 0);
    const daysUntilTarget = (entry.weekday - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + daysUntilTarget);
    cursor.setHours(hour, minute, 0, 0);
    if (cursor < anchor) cursor.setDate(cursor.getDate() + 7);

    while (cursor <= horizonEnd) {
      toCreate.push({
        studentId,
        teacherId: student.teacherId,
        scheduledAt: new Date(cursor),
        durationMin: durationFromTimes(entry.start, entry.end),
        isRecurring: true,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  if (toCreate.length > 0) {
    await prisma.lesson.createMany({ data: toCreate });
  }
}
