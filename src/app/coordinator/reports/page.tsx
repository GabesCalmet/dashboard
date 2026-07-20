import { PageHeader } from "@/components/shared/page-header";
import { ReportCard } from "@/components/reports/report-card";

const reports = [
  { type: "students", title: "Alunos", description: "Cadastro completo de todos os alunos." },
  { type: "lessons", title: "Aulas", description: "Histórico completo de todas as aulas." },
  { type: "cancellations", title: "Cancelamentos", description: "Aulas canceladas por qualquer motivo." },
  { type: "makeups", title: "Reposições", description: "Aulas marcadas como reposição." },
];

export default function CoordinatorReportsPage() {
  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Exporte dados acadêmicos em CSV (compatível com Excel/Sheets)."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <ReportCard key={r.type} {...r} />
        ))}
      </div>
    </div>
  );
}
