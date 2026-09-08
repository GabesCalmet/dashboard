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

      <PageHeader
        title="Seu pagamento"
        description={`Pagamento por aluno/grupo — valor/hora varia por aluno/grupo (padrão ${formatCurrency(detail?.fallbackHourlyRate ?? 0)} quando não configurado).`}
      />

      <div className="mb-4">
        <MonthNav basePath="/teacher/payroll" year={year} month={month} />
      </div>

      <h2 className="mb-3 text-sm font-semibold">Por aluno</h2>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Valor/hora</TableHead>
              <TableHead>Aulas</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Previsto</TableHead>
              <TableHead>Realizado</TableHead>
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
                <TableCell>{s.count}</TableCell>
                <TableCell>{s.hours.toFixed(1)}h</TableCell>
                <TableCell>{formatCurrency(s.previsto)}</TableCell>
                <TableCell>{formatCurrency(s.realizado)}</TableCell>
              </TableRow>
            ))}
            {!detail || detail.students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
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
