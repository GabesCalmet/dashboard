export type ValueHistoryEntry = { amount: number; from?: string; until?: string };

// Picks the best entry among those whose own [from, until] window overlaps
// a given period — "best" meaning whichever has the latest "from", not
// just the first one found in array order. Two vigência windows can
// genuinely overlap each other (e.g. an older open-ended entry whose
// "until" still falls inside the month a newer, more specific entry also
// covers) — picking "first in the array" then depends on insertion order
// rather than which entry was actually meant to be in effect, which is
// always whichever was declared more recently (the later "from"). Used by
// every history resolver below (amount, teacher) so a deliberately
// overlapping correction (e.g. "just this one week, a different price")
// reliably wins over the entry it's overlapping instead of silently
// losing to it — see the Flavia VIP-233 bug this was built for.
export function pickLatestOverlap<T extends { from?: string; until?: string }>(
  entries: T[],
  overlaps: (entry: T) => boolean
): T | undefined {
  let best: T | undefined;
  let bestFromMs = -Infinity;
  for (const entry of entries) {
    if (!overlaps(entry)) continue;
    const fromMs = entry.from ? new Date(entry.from).getTime() : -Infinity;
    if (!best || fromMs > bestFromMs) {
      best = entry;
      bestFromMs = fromMs;
    }
  }
  return best;
}

// A billing row's Pagador can be the student themselves (payerName: null),
// a group member paying their own share (payerName: their name), or a
// third party (payerName: the third party's name). Only the first two are
// actual students — the "Aluno" column should show whichever of them owns
// this slot, not always fall back to the primary/group-owner's name.
export function resolveSlotStudentName(
  payerName: string | null,
  student: { user: { name: string }; groupMembers: { user: { name: string } }[] }
): string {
  if (payerName) {
    const member = student.groupMembers.find((m) => m.user.name === payerName);
    if (member) return member.user.name;
  }
  return student.user.name;
}

function parseValueHistory(value: unknown): ValueHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is ValueHistoryEntry =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).amount === "number"
    )
    .map((e) => ({
      amount: e.amount,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

// Resolves what a value (dueDay, lessonsPerMonth, hourlyRate, a teacher's
// own monthly revenue share, ...) should be for a specific reference
// month — using the historical entry in effect then, if one was
// configured, falling back to the current flat value for any month no
// history entry covers (which is every month for a student/member who's
// never had a change recorded). Student billing itself (monthlyValue,
// bankAccount) no longer uses this — see StudentCharge/
// getChargeSlotsForMonth in student-charges.ts — but dueDay/
// lessonsPerMonth's own history still drives the lesson-cycle math (see
// student-detail.tsx's "Total de aulas contratadas") and teacher payroll's
// hourly-rate history, both independent of actual billing.
//
// zeroOnGap (default false) controls what an UNCOVERED month falls back to
// when some entry's own "from" starts later (meaning this month is either
// before the earliest entry, or sitting in a real gap between two bounded
// windows): true resolves it to 0, false falls back to the current flat
// value same as any other uncovered month. Only pass true for a field that
// can genuinely mean "doesn't apply this month" — lessonsPerMonth, where a
// real contract-undefined gap (e.g. a paused student with a declared
// Jan–Feb window and a separate declared Oct-onward window, nothing in
// between) must not silently inherit today's class count (see the Matheus
// VIP-162 "Total de aulas contratadas" bug this covers). dueDay and
// hourlyRate have no such "doesn't apply" state — a day of the month or a
// pay rate of 0 is never correct, it's just broken.
export function resolveHistoricalAmount(
  current: unknown,
  history: unknown,
  referenceMonth: Date,
  { zeroOnGap = false }: { zeroOnGap?: boolean } = {}
) {
  const entries = parseValueHistory(history);
  if (entries.length === 0) return Number(current);

  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);
  const match = pickLatestOverlap(entries, (e) => {
    const from = e.from ? new Date(e.from) : null;
    const until = e.until ? new Date(e.until) : null;
    if (from && from > monthEnd) return false;
    if (until && until < monthStart) return false;
    return true;
  });
  if (match) return match.amount;

  if (!zeroOnGap) return Number(current);

  // No entry covers this month. Falling back to today's current value is
  // only right for a month after every recorded entry (nothing newer has
  // been declared yet, so "whatever's current" is the best guess) — NOT
  // for a month before the earliest entry, or for a real gap sitting
  // between two separate bounded windows (e.g. a student who had a
  // recorded period in Jan–Feb, then nothing until a later Sep entry —
  // the months in between were never covered by anything and must not
  // silently inherit today's price). Any entry whose own "from" is still
  // ahead of this month means something explicit resumes later, which
  // makes this month either pre-history or an internal gap either way —
  // both resolve to 0, never to "same as today."
  const hasEntryStartingAfter = entries.some((e) => e.from && new Date(e.from) > monthEnd);
  if (hasEntryStartingAfter) return 0;
  return Number(current);
}

export function dueDateFor(monthStart: Date, day: number) {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, daysInMonth));
}

// The earliest explicitly-dated "from" across any of the given history
// arrays — used by the lesson-cycle math (student-detail.tsx's "Total de
// aulas contratadas") to honor a deliberately backdated dueDay/
// lessonsPerMonth record instead of silently clamping the cycle start to
// billingStartDate/startDate.
export function earliestHistoryFrom(...histories: unknown[]): Date | null {
  let earliest: Date | null = null;
  for (const history of histories) {
    for (const e of parseValueHistory(history)) {
      if (!e.from) continue;
      const from = new Date(e.from);
      if (!earliest || from < earliest) earliest = from;
    }
  }
  return earliest;
}
