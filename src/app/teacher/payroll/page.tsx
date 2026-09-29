import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MonthNav } from "@/components/financial/month-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { getTeacherPayrollDetail } from "@/server/queries/teachers";
import { parseMonthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function TeacherPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireRole("TEACHER");
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const detail = await getTeacherPayrollDetail(user.teacherProfile!.id, year, month);

  return (
    <div>
      <Link
        href="/teacher"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para o painel
      </Link>

      <PageHeader title="Seu pagamento" />

      <div className="mb-4">
        <MonthNav basePath="/teacher/payroll" year={year} month={month} />
      </div>

      <h2 className="mb-3 text-sm font-semibold">Por aluno</h2>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className="align-bottom">Aluno</TableHead>
              <TableHead rowSpan={2} className="align-bottom">Valor/hora</TableHead>
              <TableHead colSpan={3} className="border-l text-center">Previsto</TableHead>
              <TableHead colSpan={3} className="border-l text-center">Atual</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="border-l">Aulas</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="border-l">Aulas</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail?.students.map((s) => (
              <TableRow key={s.studentId}>
                <TableCell className="p-0">
                  <Link
                    href={`/teacher/students/${s.studentId}`}
                    className="block px-3 py-2.5 hover:underline"
                  >
                    {s.studentName}
                  </Link>
                </TableCell>
                <TableCell>{formatCurrency(s.rate)}</TableCell>
                <TableCell className="border-l">{s.count}</TableCell>
                <TableCell>{s.hours.toFixed(1)}h</TableCell>
                <TableCell>{formatCurrency(s.previsto)}</TableCell>
                <TableCell className="border-l">{s.realizedCount}</TableCell>
                <TableCell>{s.realizedHours.toFixed(1)}h</TableCell>
                <TableCell>{formatCurrency(s.realizado)}</TableCell>
              </TableRow>
            ))}
            {!detail || detail.students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhum aluno neste mês.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
