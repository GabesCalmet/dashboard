import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MonthNav } from "@/components/financial/month-nav";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTeacherPayrollDetail } from "@/server/queries/teachers";
import { parseMonthParam } from "@/lib/month-param";
import { formatCurrency, lessonStatusLabel } from "@/lib/labels";

export default async function AdminTeacherPayrollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teacherId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { teacherId } = await params;
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const detail = await getTeacherPayrollDetail(teacherId, year, month);
  if (!detail) notFound();

  return (
    <div>
      <Link
        href="/admin/financial/gastos/professores"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para pagamento de professores
      </Link>

      <PageHeader
        title={detail.teacherName}
        description={`Horas e pagamento por tipo de aula — valor/hora ${formatCurrency(detail.hourlyRate)}.`}
      />

      <div className="mb-4">
        <MonthNav
          basePath={`/admin/financial/gastos/professores/${teacherId}`}
          year={year}
          month={month}
        />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Aulas</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Conta em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.groups.map((g) => (
              <TableRow key={g.status}>
                <TableCell>{lessonStatusLabel[g.status]}</TableCell>
                <TableCell>{g.count}</TableCell>
                <TableCell>{g.hours.toFixed(1)}h</TableCell>
                <TableCell>{formatCurrency(g.pay)}</TableCell>
                <TableCell className="space-x-1.5">
                  {g.countsAsPrevisto && <Badge variant="outline">Previsto</Badge>}
                  {g.countsAsRealizado && <Badge variant="success">Realizado</Badge>}
                  {!g.countsAsPrevisto && !g.countsAsRealizado && (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {detail.groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhuma aula neste mês.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {detail.groups.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total previsto / realizado</TableCell>
                <TableCell colSpan={2} className="space-x-3">
                  <span>{formatCurrency(detail.totals.previsto)}</span>
                  <span className="text-muted-foreground">/</span>
                  <span>{formatCurrency(detail.totals.realizado)}</span>
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
