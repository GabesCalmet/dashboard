import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPieChart } from "@/components/financial/category-pie-chart";
import { formatCurrency, chargeCategoryBadgeClassName } from "@/lib/labels";
import type { CategoryBreakdownRow } from "@/server/queries/financial";

// Pie chart (student count by tier) plus one card per Categoria tier
// (including "Sem categoria" when relevant) on the Financeiro page — how
// many currently active students are in that tier and their average
// profit this month (own cobrança revenue minus what their teacher is
// contracted to earn from them) — see getCategoryBreakdownForMonth.
export function CategoryBreakdownSection({ rows }: { rows: CategoryBreakdownRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Alunos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <CategoryPieChart rows={rows} />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {rows.map((r) => (
            <Card key={r.label}>
              <CardContent className="space-y-1.5 p-4">
                {r.category ? (
                  <Badge variant="outline" className={chargeCategoryBadgeClassName[r.category]}>
                    {r.label}
                  </Badge>
                ) : (
                  <Badge variant="outline">{r.label}</Badge>
                )}
                <p className="text-2xl font-semibold">{r.studentCount}</p>
                <p className="text-xs text-muted-foreground">
                  {r.studentCount === 1 ? "aluno" : "alunos"}
                </p>
                <p className="text-sm font-medium">Lucro médio: {formatCurrency(r.avgProfit)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
