import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Percent } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAffiliateDetail } from "@/server/queries/affiliates";

export default async function AffiliateDashboardPage() {
  const user = await requireRole("AFFILIATE");
  const affiliate = await getAffiliateDetail(user.affiliateProfile!.id);

  return (
    <div>
      <PageHeader title={`Olá, ${user.name.split(" ")[0]}`} description="Seus alunos indicados." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Alunos indicados"
          value={String(affiliate?.referredStudents.length ?? 0)}
          icon={Users}
          accent
        />
        <StatCard
          label="Comissão"
          value={affiliate?.commissionPercent !== null ? `${Number(affiliate?.commissionPercent)}%` : "A definir"}
          icon={Percent}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alunos indicados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {affiliate?.referredStudents.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-2 text-sm">
              <span>{s.groupName ?? s.user.name}</span>
              <Badge variant={s.status === "ACTIVE" ? "success" : "outline"}>
                {s.status === "ACTIVE" ? "Ativo" : s.status === "PAUSED" ? "Pausado" : "Cancelado"}
              </Badge>
            </div>
          ))}
          {(!affiliate || affiliate.referredStudents.length === 0) && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum aluno indicado ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
