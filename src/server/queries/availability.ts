import { prisma } from "@/lib/prisma";

type ScheduleEntry = { weekday: number; start: string; end: string; from?: string; until?: string };

function parseScheduleEntries(value: unknown): ScheduleEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is Record<string, unknown> =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).weekday === "number"
    )
    .map((e) => ({
      weekday: e.weekday as number,
      start: typeof e.start === "string" ? e.start : "",
      end: typeof e.end === "string" ? e.end : "",
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

function isEntryCurrentlyActive(e: { from?: string; until?: string }, today: string): boolean {
  return (!e.from || e.from <= today) && (!e.until || e.until >= today);
}

function timeToMinutes(t: string): number | null {
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Which active teachers have no recurring commitment (an active student's
// weekly class, or their own blocked hours) overlapping the given time —
// purely the weekly pattern, not any specific calendar date's one-off/
// makeup bookings, since this is for "can I assign a new weekly class
// here" rather than "is this exact date free". Only entries currently in
// effect (within their own vigência, if any) count.
//
// weekday omitted means "free at this time on every single weekday" — a
// teacher only qualifies if nothing conflicts on any of the 7 days.
export async function getAvailableTeachers({
  weekday,
  start,
  end,
}: {
  weekday?: number;
  start: string;
  end: string;
}): Promise<{ id: string; name: string }[]> {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin === null || endMin === null || startMin >= endMin) return [];

  const teachers = await prisma.teacherProfile.findMany({
    where: { user: { active: true } },
    include: {
      user: true,
      students: { where: { status: "ACTIVE" }, select: { lessonSchedule: true } },
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const weekdaysToCheck = weekday !== undefined ? [weekday] : [0, 1, 2, 3, 4, 5, 6];

  return teachers
    .filter((t) => {
      const blocked = parseScheduleEntries(t.blockedSlots).filter((e) => isEntryCurrentlyActive(e, today));
      const studentEntries = t.students.flatMap((s) =>
        parseScheduleEntries(s.lessonSchedule).filter((e) => isEntryCurrentlyActive(e, today))
      );
      const allEntries = [...blocked, ...studentEntries];

      return weekdaysToCheck.every((wd) => {
        const conflict = allEntries.some((e) => {
          if (e.weekday !== wd || !e.start || !e.end) return false;
          const eStart = timeToMinutes(e.start);
          const eEnd = timeToMinutes(e.end);
          if (eStart === null || eEnd === null) return false;
          return rangesOverlap(startMin, endMin, eStart, eEnd);
        });
        return !conflict;
      });
    })
    .map((t) => ({ id: t.id, name: t.user.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
