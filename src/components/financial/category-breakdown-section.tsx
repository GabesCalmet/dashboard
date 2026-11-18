import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPieChart } from "@/components/financial/category-pie-chart";
import { CategoryProfitChart } from "@/components/financial/category-profit-chart";
import { chargeCategoryChartColor } from "@/lib/labels";
import type { CategoryBreakdownRow } from "@/server/queries/financial";

// Two side-by-side sections on the Financeiro page: the pie (student
// count by tier) with its legend beside it, and a bar chart comparing
// average profit across tiers — see getCategoryBreakdownForMonth. The
// bar chart doesn't repeat the tier names/order — identity is already
// established by the matching colors in the pie's own legend.
export function CategoryBreakdownSection({ rows }: { rows: CategoryBreakdownRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Alunos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex items-center justify-center gap-4">
            <div className="flex shrink-0 flex-col gap-3">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: r.category
                        ? chargeCategoryChartColor[r.category]
                        : "var(--color-muted-foreground)",
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.studentCount} {r.studentCount === 1 ? "aluno" : "alunos"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <CategoryPieChart rows={rows} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
              Lucro médio por categoria
            </p>
            <CategoryProfitChart rows={rows} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
