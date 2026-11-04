import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Admin-only — see src/app/api/admin/backup/route.ts. A plain link (not a
// client fetch) so the browser's own download handling takes over once
// the Content-Disposition header arrives; same-origin cookies are sent
// automatically, so no extra auth plumbing is needed here.
export function BackupCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup</CardTitle>
        <CardDescription>
          Baixa todos os dados do sistema (alunos, professores, aulas, financeiro, tudo) em um
          arquivo. Não inclui senhas de login. Gere um novo sempre que quiser ter uma cópia
          recente salva no seu computador.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild>
          <a href="/api/admin/backup?format=json">
            <Download /> Baixar backup (JSON)
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="/api/admin/backup?format=csv">
            <Download /> Baixar backup (CSV/ZIP)
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
