import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthParam } from "@/lib/month-param";

// Opens the "Relatório Financeiro Mensal" viewer page (not the raw PDF
// directly) in a new tab for whichever month this page is currently
// showing — that page embeds the PDF inline and offers its own explicit
// "Baixar PDF" button, same split the student monthly report gets.
export function FinancialReportButton({ year, month }: { year: number; month: number }) {
  return (
    <Button asChild size="lg">
      <a
        href={`/admin/financial/report?month=${monthParam(year, month)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FileSpreadsheet className="size-4" /> Relatório financeiro
      </a>
    </Button>
  );
}
