"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Downloads the "Relatório Mensal de Aulas" PDF for one student/month. Does
// this via fetch + a Blob-triggered <a download>, rather than a plain
// <a href> navigation — a direct navigation to a PDF URL lets the
// browser's own PDF viewer open it inline first (the user then has to find
// its own download button), even with Content-Disposition: attachment set
// server-side. A JS-triggered blob download is never treated as "navigate
// to view," so it always goes straight to a file save instead.
export function MonthlyReportButton({
  studentId,
  year,
  month,
}: {
  studentId: string;
  year: number;
  month: number;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}/monthly-report?year=${year}&month=${month}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Erro ao gerar relatório.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? "relatorio.pdf";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar relatório.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button size="lg" onClick={handleClick} disabled={isLoading}>
      {isLoading ? <Loader2 className="animate-spin" /> : <FileDown className="size-4" />}
      Gerar relatório
    </Button>
  );
}
