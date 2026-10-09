import { prisma } from "@/lib/prisma";
import { BRAZIL_UTC_OFFSET_MS, endOfBrazilDay, toBrazilDateString } from "@/lib/timezone";

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
    const until = e.until ? endOfBrazilDay(new Date(e.until)) : null;
    if (from && date < from) return false;
    if (until && date > until) return false;
    return true;
  });
  return match ? match.id : defaultTeacherId;
}

// Regenerates a student's recurring lessons (from their enrollment start
// date through the last class on/before the 15th of the month closing out
// the next ~HORIZON_WEEKS, or their course end date if that comes sooner)
// to match their current weekly schedule.
//
// Matches by CALENDAR DATE, not exact instant: if a schedule entry's time
// changed but a lesson already exists on the same date (whatever its
// status — SCHEDULED, COMPLETED, CANCELED_HOLIDAY, ...), that existing row
// is just retimed in place (scheduledAt/durationMin/teacherId updated),
// preserving everything else about it (status, resumo, observações). This
// is what lets "I only changed the time" actually just change the time,
// even for a class a teacher already reported on, instead of leaving the
// old one stranded and generating a duplicate placeholder alongside it.
//
// A date that no longer matches any current schedule entry only gets
// deleted while still SCHEDULED (unconfirmed) — once a teacher has really
// reported an outcome for it, or a date's entry was removed from the
// schedule entirely, that row is real history and stays untouched. Manual
// bookings and makeups (isRecurring: false) are never touched either way.
export async function syncRecurringLessons(studentId: string) {
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student || !student.teacherId) return;

  if (student.status !== "ACTIVE") {
    // Paused/cancelled: no schedule is currently generating anything, so
    // just drop any leftover not-yet-happened placeholder — real reported
    // history stays either way. Becoming ACTIVE again regenerates fresh.
    await prisma.lesson.deleteMany({
      where: { studentId, isRecurring: true, status: "SCHEDULED" },
    });
    return;
  }

  const schedule = parseSchedule(student.lessonSchedule);

  const [existingRecurring, otherLessons] = await Promise.all([
    prisma.lesson.findMany({
      where: { studentId, isRecurring: true },
      select: { id: true, scheduledAt: true, status: true },
    }),
    // Manual bookings/makeups — never touched, only used below to avoid
    // double-booking a brand new generated lesson onto the exact same
    // instant one of these already occupies.
    prisma.lesson.findMany({
      where: { studentId, isRecurring: false },
      select: { scheduledAt: true },
    }),
  ]);

  if (schedule.length === 0) {
    const toDelete = existingRecurring.filter((l) => l.status === "SCHEDULED").map((l) => l.id);
    if (toDelete.length > 0) {
      await prisma.lesson.deleteMany({ where: { id: { in: toDelete } } });
    }
    return;
  }

  const blockedTimes = new Set(otherLessons.map((l) => l.scheduledAt.getTime()));
  const existingByDate = new Map<string, typeof existingRecurring>();
  for (const l of existingRecurring) {
    const key = toBrazilDateString(l.scheduledAt);
    const bucket = existingByDate.get(key);
    if (bucket) bucket.push(l);
    else existingByDate.set(key, [l]);
  }

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
  // endOfBrazilDay so a class later that same day in Brazil time (which,
  // after the timezone fix, lands after UTC midnight) isn't excluded.
  const horizonEnd = student.endDate ? endOfBrazilDay(student.endDate) : snappedHorizonEnd;

  const claimed = new Set<string>();
  const toCreate: {
    studentId: string;
    teacherId: string;
    scheduledAt: Date;
    durationMin: number;
    isRecurring: true;
  }[] = [];
  const toRetime: { id: string; scheduledAt: Date; durationMin: number; teacherId: string }[] = [];

  for (const entry of schedule) {
    if (!entry.start) continue;
    const [hour, minute] = entry.start.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

    // An entry's own explicit "from" is always honored as-is, even when
    // it's earlier than the student's enrollment startDate — the cadastro
    // is the source of truth, so an entry deliberately backdated (e.g. to
    // record a real earlier period) isn't silently clamped away. anchor
    // is only the fallback for an entry with no "from" of its own at all.
    const entryFrom = entry.from ? new Date(entry.from) : null;
    // endOfBrazilDay — otherwise a class later that same day in Brazil time
    // (which lands after UTC midnight, post timezone fix) gets excluded by
    // an "until" set to that exact day, as happened for a Saturday 08:00
    // class landing at 11:00 UTC against an "until" of UTC midnight.
    const entryUntil = entry.until ? endOfBrazilDay(new Date(entry.until)) : null;
    const rangeStart = entryFrom ?? anchor;
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
      const dateKey = toBrazilDateString(cursor);
      const candidate = (existingByDate.get(dateKey) ?? []).find((l) => !claimed.has(l.id));
      if (candidate) {
        claimed.add(candidate.id);
        if (candidate.scheduledAt.getTime() !== cursor.getTime()) {
          toRetime.push({
            id: candidate.id,
            scheduledAt: new Date(cursor),
            durationMin: durationFromTimes(entry.start, entry.end),
            teacherId: resolveTeacherId(student.teacherId, teacherHistory, cursor),
          });
        }
      } else if (!blockedTimes.has(cursor.getTime())) {
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

  // Anything isRecurring that no current entry claimed is orphaned — a
  // date/weekday the schedule no longer produces. Only safe to remove
  // while still SCHEDULED; anything a teacher already reported on stays
  // as real history even for a schedule that's since changed.
  const toDelete = existingRecurring
    .filter((l) => !claimed.has(l.id) && l.status === "SCHEDULED")
    .map((l) => l.id);

  await Promise.all([
    toDelete.length > 0 ? prisma.lesson.deleteMany({ where: { id: { in: toDelete } } }) : null,
    ...toRetime.map((u) =>
      prisma.lesson.update({
        where: { id: u.id },
        data: { scheduledAt: u.scheduledAt, durationMin: u.durationMin, teacherId: u.teacherId },
      })
    ),
  ]);
  if (toCreate.length > 0) {
    await prisma.lesson.createMany({ data: toCreate });
  }
}
