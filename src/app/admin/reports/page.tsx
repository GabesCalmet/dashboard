import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ReportCard } from "@/components/reports/report-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reports = [
  { type: "students", title: "Alunos", description: "Cadastro completo de todos os alunos." },
  { type: "teachers", title: "Professores", description: "Cadastro completo de todos os professores." },
  { type: "lessons", title: "Aulas", description: "Histórico completo de todas as aulas." },
  { type: "financial", title: "Financeiro", description: "Pagamentos, vencimentos e status." },
  { type: "cancellations", title: "Cancelamentos", description: "Aulas canceladas por qualquer motivo." },
  { type: "makeups", title: "Reposições", description: "Aulas marcadas como reposição." },
  { type: "hours", title: "Horas trabalhadas", description: "Total de horas lecionadas por professor." },
];

export default function AdminReportsPage() {
  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Exporte dados da escola em CSV (compatível com Excel/Sheets). Exportação em PDF chegará em breve."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Relatório de aulas (visualização e edição)</CardTitle>
          <CardDescription>
            Veja o status de todas as aulas em tempo real e edite diretamente pelo navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/reports/lessons">
              <FileBarChart /> Abrir relatório de aulas
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <ReportCard key={r.type} {...r} />
        ))}
      </div>
    </div>
  );
}
