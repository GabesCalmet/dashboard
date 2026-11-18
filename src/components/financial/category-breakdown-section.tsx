import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, chargeCategoryBadgeClassName } from "@/lib/labels";
import type { CategoryBreakdownRow } from "@/server/queries/financial";

// One card per Categoria tier (plus "Sem categoria" when relevant) on the
// Financeiro page — how many currently active students are in that tier
// and their average profit this month (own cobrança revenue minus what
// their teacher is contracted to earn from them) — see
// getCategoryBreakdownForMonth.
export function CategoryBreakdownSection({ rows }: { rows: CategoryBreakdownRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold">Alunos por categoria</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
    </div>
  );
}
