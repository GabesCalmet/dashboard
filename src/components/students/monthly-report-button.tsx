import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens the in-app report viewer page (not the raw PDF directly) — a
// plain new-tab link to the PDF left someone stuck with no way back and
// no visible download button inside an installed PWA/app wrapper on a
// phone. The viewer page has its own explicit "Voltar" and "Baixar PDF".
export function MonthlyReportButton({ href }: { href: string }) {
  return (
    <Button asChild size="lg">
      <Link href={href}>
        <FileText className="size-4" /> Visualizar Relatório
      </Link>
    </Button>
  );
}
