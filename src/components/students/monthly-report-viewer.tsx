"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Same "embed the PDF in a normal page instead of handing the raw
// response straight to the browser" split as the admin financial report
// viewer — behaves consistently everywhere it's opened, including inside
// an installed PWA/app wrapper, where a bare new-tab PDF can leave
// someone stuck with no way back and no visible download control.

// The report is always a single A4 page (595.28 x 841.89pt @ 96dpi).
// iOS Safari's embedded PDF viewer ignores #view=Fit/#zoom open
// parameters and always renders at native size, so on a narrow phone the
// page overflows and needs horizontal scrolling to read. Giving the
// iframe a fixed A4-sized viewport (so the PDF itself always renders at
// "real" 100%) and then visually scaling that iframe down with a CSS
// transform works everywhere, since the transform applies to the
// rendered pixels regardless of what the native viewer does internally.
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const width = container.clientWidth;
      // Never upscale past native resolution (would just look blurry on
      // wide screens) — only shrink to fit narrower viewports.
      setScale(Math.min(1, width / PAGE_WIDTH_PX));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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

      <div
        ref={containerRef}
        className="mx-auto overflow-hidden rounded-lg border"
        style={{ maxWidth: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX * scale }}
      >
        <iframe
          src={`${pdfUrl}#view=Fit`}
          title={`Relatório mensal — ${monthLabel}`}
          width={PAGE_WIDTH_PX}
          height={PAGE_HEIGHT_PX}
          style={{ border: "none", transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      </div>
    </div>
  );
}
