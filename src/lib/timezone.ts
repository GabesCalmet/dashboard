// Brazil ("America/Sao_Paulo") has been a fixed UTC-3 offset year-round
// since DST was abolished nationwide in 2019, so the offset can safely be
// hardcoded here instead of resolved through the IANA timezone database.
//
// Vercel's Node runtime always executes in UTC regardless of the
// deployment region (the `regions` setting in vercel.json only controls
// where the function physically runs, not its process timezone), so
// parsing a "YYYY-MM-DDTHH:mm:00" string with no offset gets interpreted
// as UTC instead of the Brazil wall-clock time the user actually typed —
// e.g. a class entered as 17:30 would silently get stored as 17:30 UTC
// (14:30 Brazil) instead of 20:30 UTC (17:30 Brazil). Use this helper
// anywhere a date + time input pair from a form represents a Brazil
// wall-clock instant.
export function brazilDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00-03:00`);
}

export const BRAZIL_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

// Given a Date built from a date-only "YYYY-MM-DD" input (which JS parses
// as UTC midnight of that day), returns the instant representing the end
// of that same calendar day in Brazil time (23:59:59.999 Brazil). Used
// wherever such a date is compared as an inclusive upper bound (e.g. a
// schedule entry's "until", or a course end date) against a real
// Brazil-timezone instant — otherwise a class later that same day in
// Brazil time falls after UTC midnight and gets wrongly excluded.
export function endOfBrazilDay(utcMidnight: Date): Date {
  return new Date(utcMidnight.getTime() + 24 * 60 * 60 * 1000 + BRAZIL_UTC_OFFSET_MS - 1);
}
