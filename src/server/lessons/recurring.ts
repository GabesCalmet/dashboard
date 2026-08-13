import { prisma } from "@/lib/prisma";
import { BRAZIL_UTC_OFFSET_MS } from "@/lib/timezone";

const HORIZON_WEEKS = 12;

type ScheduleEntry = {
  weekday: number;
  start: string;
  end: string;
  // Scopes when this specific entry is in effect — set when a schedule
  // changed and the old entry was kept on record instead of deleted.
  // Undefined means "since enrollment" / "still ongoing" respectively.
  from?: string;
  until?: string;
};

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
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

function durationFromTimes(start: string, end: string) {
  if (!start || !end) return 50;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes : 50;
}

type SelectHistoryEntry = { id: string; from?: string; until?: string };

function parseSelectHistory(value: unknown): SelectHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is SelectHistoryEntry =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).id === "string"
    )
    .map((e) => ({
      id: e.id,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

// Resolves which teacher a lesson on a given date should be assigned to —
// using the historical entry in effect then, if a teacher change was
// recorded, falling back to the student's current teacherId for any date
// no history entry covers.
function resolveTeacherId(defaultTeacherId: string, history: SelectHistoryEntry[], date: Date) {
  if (history.length === 0) return defaultTeacherId;
  const match = history.find((e) => {
    const from = e.from ? new Date(e.from) : null;
    const until = e.until ? new Date(e.until) : null;
    if (from && date < from) return false;
    if (until && date > until) return false;
    return true;
  });
  return match ? match.id : defaultTeacherId;
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

  // Anything still on the books after the delete above — a real reported
  // outcome (OK/NC/CA/...) or a manually booked lesson — must never be
  // duplicated by the generator below, even if the weekly schedule would
  // otherwise also land on that exact date/time (e.g. when backfilling a
  // gap that spans dates already reported on).
  const existingLessons = await prisma.lesson.findMany({
    where: { studentId },
    select: { scheduledAt: true },
  });
  const existingTimes = new Set(existingLessons.map((l) => l.scheduledAt.getTime()));
  const teacherHistory = parseSelectHistory(student.teacherHistory);

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
  // A student with a course end date gets every class generated through
  // that exact date — overriding the rolling ~12-week/15th window entirely,
  // since the whole point of setting it is to define that course's real
  // generation window (which may run shorter or longer than the default).
  const horizonEnd = student.endDate ?? snappedHorizonEnd;
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

    // An entry's own from/until only ever narrows the overall
    // [anchor, horizonEnd] window — e.g. an old entry kept on record after
    // a schedule change gets an "until" so it stops generating past the
    // date it was replaced, while the new entry's "from" picks up after it.
    const entryFrom = entry.from ? new Date(entry.from) : null;
    const entryUntil = entry.until ? new Date(entry.until) : null;
    const rangeStart = entryFrom && entryFrom > anchor ? entryFrom : anchor;
    const rangeEnd = entryUntil && entryUntil < horizonEnd ? entryUntil : horizonEnd;
    if (rangeStart > rangeEnd) continue;

    const cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);
    const daysUntilTarget = (entry.weekday - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + daysUntilTarget);
    // setHours operates in the server's local time, which on Vercel is
    // always UTC regardless of deployment region — so this sets hour:minute
    // as if it were already UTC. Shift by the Brazil offset to get the
    // instant that's actually hour:minute in Brazil wall-clock time.
    cursor.setHours(hour, minute, 0, 0);
    cursor.setTime(cursor.getTime() + BRAZIL_UTC_OFFSET_MS);
    if (cursor < rangeStart) cursor.setDate(cursor.getDate() + 7);

    while (cursor <= rangeEnd) {
      if (!existingTimes.has(cursor.getTime())) {
        toCreate.push({
          studentId,
          teacherId: resolveTeacherId(student.teacherId, teacherHistory, cursor),
          scheduledAt: new Date(cursor),
          durationMin: durationFromTimes(entry.start, entry.end),
          isRecurring: true,
        });
      }
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  if (toCreate.length > 0) {
    await prisma.lesson.createMany({ data: toCreate });
  }
}
