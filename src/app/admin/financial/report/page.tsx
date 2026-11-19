import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseMonthParam } from "@/lib/month-param";

// Opens the "Relatório Financeiro Mensal" PDF embedded in a normal page
// instead of handing the raw PDF response straight to the browser — same
// "view inline, download if you want it" split as the student monthly
// report, but as its own page (rather than relying on the browser's bare
// native PDF viewer) so it behaves consistently everywhere this link is
// opened, including inside an installed PWA/app wrapper.
export default async function FinancialReportViewerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
  const pdfUrl = `/api/admin/financial-report?year=${year}&month=${month}`;
  const filename = `relatorio-financeiro-${year}-${String(month + 1).padStart(2, "0")}.pdf`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            Relatório financeiro — {monthLabel}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize abaixo ou baixe o PDF.
          </p>
        </div>
        <Button asChild>
          <a href={pdfUrl} download={filename}>
            <Download className="size-4" /> Baixar PDF
          </a>
        </Button>
      </div>
      <iframe
        src={pdfUrl}
        title={`Relatório financeiro — ${monthLabel}`}
        className="h-[80vh] w-full rounded-lg border"
      />
    </div>
  );
}
