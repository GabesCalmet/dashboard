import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens the "Relatório Financeiro Mensal" PDF for whichever month this
// page is currently showing — a plain link (no `download` attribute) so
// the browser's own PDF viewer shows it first, same convention as
// MonthlyReportButton.
export function FinancialReportButton({ year, month }: { year: number; month: number }) {
  return (
    <Button asChild variant="outline">
      <a
        href={`/api/admin/financial-report?year=${year}&month=${month}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FileSpreadsheet className="size-4" /> Relatório financeiro
      </a>
    </Button>
  );
}
