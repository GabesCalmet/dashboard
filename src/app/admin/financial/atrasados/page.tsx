import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LatePaymentsTable } from "@/components/financial/late-payments-table";
import { getLatePayments } from "@/server/queries/financial";

export default async function AdminLatePaymentsPage() {
  const payments = await getLatePayments();

  return (
    <div>
      <Link
        href="/admin/financial"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Financeiro
      </Link>

      <PageHeader
        title="Pagamentos atrasados"
        description="Todas as cobranças em atraso, de qualquer mês."
      />

      <LatePaymentsTable payments={payments} />
    </div>
  );
}
