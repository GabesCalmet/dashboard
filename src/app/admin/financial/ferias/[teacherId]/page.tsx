import Link from "next/link";
import { notFound } from "next/navigation";
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
import { getTeacherPayrollDetail } from "@/server/queries/teachers";
import { parseMonthParam, monthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

// Just what feeds this teacher's Férias total for one month — student,
// how many classes they're contracted for, and the slice of Férias that
// comes from them (contratado × 8,3%) — not the full previsto/atual/
// pagamento breakdown the main payroll detail page shows. PERCENTAGE-mode
// students are left out entirely, since they never contribute to Férias
// (see getTeacherPayrollForMonth's contratadoFerias).
export default async function AdminFeriasTeacherDetailPage({
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

  const students = detail.students
    .filter((s) => s.mode !== "PERCENTAGE")
    .map((s) => ({ ...s, ferias: s.contratado * 0.083 }))
    .sort((a, b) => b.ferias - a.ferias);
  const total = students.reduce((sum, s) => sum + s.ferias, 0);

  return (
    <div>
      <Link
        href={`/admin/financial/ferias?month=${monthParam(year, month)}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Férias
      </Link>

      <PageHeader
        title={detail.teacherName}
        description="Quanto cada aluno contribui para a provisão de férias deste mês — aulas contratadas × valor/hora, 8,3%. Assignments pagos por porcentagem não aparecem aqui."
      />

      <div className="mb-4">
        <MonthNav basePath={`/admin/financial/ferias/${teacherId}`} year={year} month={month} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Aulas</TableHead>
              <TableHead>Férias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.studentId}>
                <TableCell className="p-0">
                  <Link
                    href={`/admin/students/${s.studentId}`}
                    className="block px-3 py-2.5 hover:underline"
                  >
                    {s.studentName}
                  </Link>
                </TableCell>
                <TableCell>{s.contractedCount}</TableCell>
                <TableCell>{formatCurrency(s.ferias)}</TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  Nenhum aluno entra na provisão de férias deste mês.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {students.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell>{formatCurrency(total)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
