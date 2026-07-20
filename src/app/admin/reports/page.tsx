import { PageHeader } from "@/components/shared/page-header";
import { ReportCard } from "@/components/reports/report-card";

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <ReportCard key={r.type} {...r} />
        ))}
      </div>
    </div>
  );
}
