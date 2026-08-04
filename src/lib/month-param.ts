// Shared ?month=YYYY-MM handling for the Financeiro pages (Receita, Gastos)
// that let a specific past/future month be viewed and backfilled.
export function parseMonthParam(month?: string) {
  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (y && m && m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function monthParam(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
