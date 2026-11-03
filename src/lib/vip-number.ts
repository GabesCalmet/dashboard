// Students here are conventionally named "<Nome> VIP-<N>" (e.g. "Sami
// VIP-158") — there's no dedicated field for it, just a number folded into
// the free-text name. This reads that convention back out so a new cadastro
// can default to the next number in the sequence instead of the admin
// having to go look up the last one by hand.
const VIP_NUMBER_RE = /VIP-(\d+)/i;

export function extractVipNumber(name: string): number | null {
  const match = name.match(VIP_NUMBER_RE);
  return match ? Number(match[1]) : null;
}

// One past the highest VIP-<N> already in use across every student/group-
// member name, or null if nothing follows that convention yet.
export function nextVipNumber(names: (string | null | undefined)[]): number | null {
  const numbers = names
    .map((n) => (n ? extractVipNumber(n) : null))
    .filter((n): n is number => n !== null);
  if (numbers.length === 0) return null;
  return Math.max(...numbers) + 1;
}
