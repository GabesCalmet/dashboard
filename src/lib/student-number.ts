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

// The same trailing "LABEL-number" token (e.g. "VIP-144", "GRU-23") as a
// standalone piece, for display — splits it off the end of the name
// instead of showing it folded into the person's actual name. The label
// itself isn't fixed (see above), so this only requires the last
// whitespace-separated word to end in a number; a plain surname never
// matches (no digits), so a student with no such suffix is untouched.
const ID_SUFFIX_RE = /^[A-Za-zÀ-ÿ]+-?\d+$/;

export function splitStudentIdSuffix(name: string): { displayName: string; idSuffix: string | null } {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  if (parts.length < 2 || !last || !ID_SUFFIX_RE.test(last)) {
    return { displayName: name, idSuffix: null };
  }
  return { displayName: parts.slice(0, -1).join(" "), idSuffix: last };
}
