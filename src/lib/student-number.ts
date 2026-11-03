// Students here are often named with a trailing sequence number (e.g.
// "Sami VIP-158"), but the label in front of the number ("VIP-", or
// anything else) isn't fixed and can change — so this only reads back the
// last number appearing in each name, not any particular prefix, to
// suggest the next one for a new cadastro instead of the admin having to
// go look up the last one by hand.
const TRAILING_NUMBER_RE = /(\d+)(?!.*\d)/;

export function extractTrailingNumber(name: string): number | null {
  const match = name.match(TRAILING_NUMBER_RE);
  return match ? Number(match[1]) : null;
}

// One past the highest trailing number already in use across every
// student/group-member name, or null if no name has one yet.
export function nextStudentNumber(names: (string | null | undefined)[]): number | null {
  const numbers = names
    .map((n) => (n ? extractTrailingNumber(n) : null))
    .filter((n): n is number => n !== null);
  if (numbers.length === 0) return null;
  return Math.max(...numbers) + 1;
}
