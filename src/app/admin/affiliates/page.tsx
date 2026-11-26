import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliateFormDialog } from "@/components/affiliates/affiliate-form-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAffiliates } from "@/server/queries/affiliates";

export default async function AdminAffiliatesPage() {
  const affiliates = await listAffiliates();

  return (
    <div>
      <PageHeader
        title="Afiliados"
        description={`${affiliates.length} afiliados cadastrados`}
        actions={<AffiliateFormDialog />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {affiliates.map((a) => (
          <Link key={a.id} href={`/admin/affiliates/${a.id}`}>
            <Card className="transition-colors hover:border-accent/50">
              <CardContent className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{a.name}</p>
                  <Badge variant={a.active ? "success" : "outline"}>
                    {a.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">@{a.username}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{a.referredStudentsCount} alunos indicados</span>
                  <span>{a.commissionPercent !== null ? `${a.commissionPercent}% comissão` : "Comissão a definir"}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {affiliates.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            Nenhum afiliado cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
