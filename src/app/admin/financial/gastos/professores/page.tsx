import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MonthNav } from "@/components/financial/month-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTeacherPayrollForMonth } from "@/server/queries/teachers";
import { parseMonthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function AdminTeacherPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const { rows, totals } = await getTeacherPayrollForMonth(year, month);

  return (
    <div>
      <Link
        href="/admin/financial/gastos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Gastos
      </Link>

      <PageHeader
        title="Pagamento de professores"
        description="Previsto (todas as aulas do mês) e realizado (aulas já dadas/repostas), por professor."
      />

      <div className="mb-4">
        <MonthNav basePath="/admin/financial/gastos/professores" year={year} month={month} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Previsto</TableHead>
              <TableHead>Realizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.teacherId}>
                <TableCell className="p-0">
                  <Link
                    href={`/admin/teachers/${r.teacherId}`}
                    className="block px-3 py-2.5 hover:underline"
                  >
                    {r.teacherName}
                  </Link>
                </TableCell>
                <TableCell>{formatCurrency(r.previsto)}</TableCell>
                <TableCell>{formatCurrency(r.realizado)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  Nenhum professor ativo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell>{formatCurrency(totals.previsto)}</TableCell>
                <TableCell>{formatCurrency(totals.realizado)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
