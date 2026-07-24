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

// Regenerates a student's upcoming recurring lessons (next HORIZON_WEEKS)
// to match their current weekly schedule. Only ever touches lessons this
// same generator created (isRecurring) that are still SCHEDULED and in the
// future — manual bookings and anything a teacher has already reported on
// are never deleted or altered.
export async function syncRecurringLessons(studentId: string) {
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student || !student.teacherId) return;

  await prisma.lesson.deleteMany({
    where: {
      studentId,
      isRecurring: true,
      status: "SCHEDULED",
      scheduledAt: { gte: new Date() },
    },
  });

  // Paused/cancelled students keep their history but stop generating new
  // lessons until they're active again (their next edit will regenerate).
  if (student.status !== "ACTIVE") return;

  const schedule = parseSchedule(student.lessonSchedule);
  if (schedule.length === 0) return;

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + HORIZON_WEEKS * 7 * 24 * 60 * 60 * 1000);
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

    const cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);
    const daysUntilTarget = (entry.weekday - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + daysUntilTarget);
    cursor.setHours(hour, minute, 0, 0);
    if (cursor < now) cursor.setDate(cursor.getDate() + 7);

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
