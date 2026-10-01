import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Downloads the "Relatório Mensal de Aulas" PDF for one student/month — a
// plain link to the PDF-generating route (not a client action), so the
// browser's own download handling does the work; no loading state needed.
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
    <Button asChild variant="outline">
      <a href={`/api/students/${studentId}/monthly-report?year=${year}&month=${month}`} download>
        <FileDown className="size-4" /> Gerar relatório
      </a>
    </Button>
  );
}
