import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { UpcomingChargesTable } from "@/components/financial/upcoming-charges-table";
import { getUpcomingCharges } from "@/server/queries/financial";

export default async function AdminUpcomingChargesPage() {
  const payments = await getUpcomingCharges();

  return (
    <div>
      <Link
        href="/admin/financial"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Financeiro
      </Link>

      <PageHeader
        title="Cobranças"
        description="Pagamentos pendentes com vencimento nos próximos 5 dias."
      />

      <UpcomingChargesTable payments={payments} />
    </div>
  );
}
