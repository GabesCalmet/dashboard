import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens the "Relatório Mensal de Aulas" PDF for one student/month in a new
// tab — a plain link (no `download` attribute), so the browser's own PDF
// viewer shows it first. That viewer has its own download/print controls,
// which is the "view it, then decide to download" flow this is meant for,
// as opposed to saving the file immediately on click.
export function MonthlyReportButton({
  studentId,
  year,
  month,
}: {
  studentId: string;
  year: number;
  month: number;
}) {
  return (
    <Button asChild size="lg">
      <a
        href={`/api/students/${studentId}/monthly-report?year=${year}&month=${month}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FileText className="size-4" /> Visualizar Relatório
      </a>
    </Button>
  );
}
