import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPieChart } from "@/components/financial/category-pie-chart";
import { formatCurrency, chargeCategoryChartColor } from "@/lib/labels";
import type { CategoryBreakdownRow } from "@/server/queries/financial";

// Pie chart (student count by tier) plus a plain, unboxed legend row on
// the Financeiro page — how many currently active students are in each
// tier and their average profit this month (own cobrança revenue minus
// what their teacher is contracted to earn from them) — see
// getCategoryBreakdownForMonth. Mirrors the PDF report's own legend
// style rather than a grid of individual cards.
export function CategoryBreakdownSection({ rows }: { rows: CategoryBreakdownRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Alunos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <CategoryPieChart rows={rows} />
        <div className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-4">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-2">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: r.category ? chargeCategoryChartColor[r.category] : "var(--color-muted-foreground)" }}
              />
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">
                  {r.studentCount} {r.studentCount === 1 ? "aluno" : "alunos"}
                </p>
                <p className="text-xs text-muted-foreground">Lucro médio: {formatCurrency(r.avgProfit)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
