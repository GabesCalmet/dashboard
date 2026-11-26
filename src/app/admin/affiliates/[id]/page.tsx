import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAffiliateDetail } from "@/server/queries/affiliates";

export default async function AdminAffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const affiliate = await getAffiliateDetail(id);
  if (!affiliate) notFound();

  return (
    <div>
      <PageHeader
        title={affiliate.user.name}
        description={`@${affiliate.user.username}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dados do afiliado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={affiliate.user.active ? "success" : "outline"}>
                {affiliate.user.active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{affiliate.user.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Telefone</span>
              <span>{affiliate.user.phone ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Comissão</span>
              <span>
                {affiliate.commissionPercent !== null
                  ? `${Number(affiliate.commissionPercent)}%`
                  : "A definir"}
              </span>
            </div>
            {affiliate.notes && (
              <div className="pt-2">
                <p className="text-muted-foreground">Observações</p>
                <p className="mt-1">{affiliate.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alunos indicados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {affiliate.referredStudents.map((s) => (
              <Link
                key={s.id}
                href={`/admin/students/${s.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-secondary"
              >
                <span>{s.groupName ?? s.user.name}</span>
                <Badge variant={s.status === "ACTIVE" ? "success" : "outline"}>
                  {s.status === "ACTIVE" ? "Ativo" : s.status === "PAUSED" ? "Pausado" : "Cancelado"}
                </Badge>
              </Link>
            ))}
            {affiliate.referredStudents.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum aluno indicado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
