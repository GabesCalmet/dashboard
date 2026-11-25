"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Same "embed the PDF in a normal page instead of handing the raw
// response straight to the browser" split as the admin financial report
// viewer — behaves consistently everywhere it's opened, including inside
// an installed PWA/app wrapper, where a bare new-tab PDF can leave
// someone stuck with no way back and no visible download control.
//
// The page itself is drawn to <canvas> with pdf.js instead of embedded
// in an <iframe>: a native PDF viewer in an iframe (especially iOS
// Safari's) ignores zoom/fit open parameters and renders with its own
// margins around the page, leaving blank space no matter how the iframe
// itself is sized or scaled. Drawing straight to a canvas sized to the
// container's width gives a pixel-exact, gap-free fit on every device,
// with the real PDF still reserved for "Baixar PDF".
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
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
  const pdfUrl = `/api/students/${studentId}/monthly-report?year=${year}&month=${month}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let renderedDoc: Awaited<ReturnType<typeof loadDocument>> | null = null;

    async function loadDocument() {
      const pdfjsLib = await import("pdfjs-dist");
      // Self-hosted (public/pdf.worker.min.mjs, copied from the installed
      // pdfjs-dist version) rather than a CDN — no third-party runtime
      // dependency, and no risk of a CDN mirror lagging behind a fresh
      // pdfjs-dist release and shipping a mismatched worker version.
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const response = await fetch(pdfUrl, { credentials: "include" });
      if (!response.ok) throw new Error("Falha ao carregar o relatório");
      const data = await response.arrayBuffer();
      return pdfjsLib.getDocument({ data }).promise;
    }

    async function renderPages() {
      try {
        const doc = await loadDocument();
        renderedDoc = doc;
        if (cancelled || !container) return;

        container.innerHTML = "";
        const dpr = window.devicePixelRatio || 1;

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          if (cancelled) return;

          const containerWidth = container.clientWidth;
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.display = "block";
          const context = canvas.getContext("2d");
          if (!context) continue;
          context.scale(dpr, dpr);

          await page.render({ canvas: null, canvasContext: context, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    renderPages();

    return () => {
      cancelled = true;
      renderedDoc?.cleanup();
    };
  }, [pdfUrl]);

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

      {error ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Não foi possível exibir o relatório aqui. Use o botão &quot;Baixar PDF&quot; acima para visualizá-lo.
        </p>
      ) : (
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-lg border">
          {loading && (
            <div className="flex h-96 items-center justify-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          <div ref={containerRef} />
        </div>
      )}
    </div>
  );
}
