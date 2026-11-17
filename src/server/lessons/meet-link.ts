import { toBrazilDateString } from "@/lib/timezone";

export type ScheduleEntryLike = { weekday: number; from?: string; until?: string; meetLink?: string };

export function parseLessonSchedule(value: unknown): ScheduleEntryLike[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is Record<string, unknown> =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).weekday === "number"
    )
    .map((e) => ({
      weekday: e.weekday as number,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
      meetLink: typeof e.meetLink === "string" && e.meetLink ? e.meetLink : undefined,
    }));
}

// Each schedule entry (one weekday/time) can have its own Meet link — a
// student with classes on different days can have a different link per
// day. Callers resolving a makeup/reposição lesson should pass the
// ORIGINAL canceled lesson's scheduledAt as `target`, not the makeup's
// own — per explicit instruction, a Wednesday class's makeup keeps
// Wednesday's link regardless of which day the makeup itself lands on.
export function resolveMeetLink(schedule: ScheduleEntryLike[], target: Date): string | null {
  const dateKey = toBrazilDateString(target);
  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const match = schedule.find(
    (e) => e.weekday === weekday && (!e.from || e.from <= dateKey) && (!e.until || e.until >= dateKey) && e.meetLink
  );
  return match?.meetLink ?? null;
}
