import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Same "embed the PDF in a normal page instead of handing the raw
// response straight to the browser" split as the admin financial report
// viewer — behaves consistently everywhere it's opened, including inside
// an installed PWA/app wrapper, where a bare new-tab PDF can leave
// someone stuck with no way back and no visible download control.
export function MonthlyReportViewer({
  studentId,
  year,
  month,
  backHref,
}: {
  studentId: string;
  year: number;
  month: number;
  backHref: string;
}) {
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
  const pdfUrl = `/api/students/${studentId}/monthly-report?year=${year}&month=${month}`;

  return (
    <div>
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            Relatório mensal — {monthLabel}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Visualize abaixo ou baixe o PDF.</p>
        </div>
        <Button asChild>
          <a href={pdfUrl} download>
            <Download className="size-4" /> Baixar PDF
          </a>
        </Button>
      </div>

      <iframe src={pdfUrl} title={`Relatório mensal — ${monthLabel}`} className="h-[80vh] w-full rounded-lg border" />
    </div>
  );
}
