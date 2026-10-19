import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthNav } from "@/components/financial/month-nav";
import { getTeacherFeriasForYear } from "@/server/queries/teachers";
import { parseMonthParam, monthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function AdminFeriasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const { teachers, totals } = await getTeacherFeriasForYear(year, month);
  const monthQuery = monthParam(year, month);

  return (
    <div>
      <Link
        href="/admin/financial"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para Financeiro
      </Link>

      <PageHeader
        title="Férias (provisão)"
        description="8,3% do que cada professor tem contratado, mês a mês (lessonsPerMonth × duração da aula × valor/hora, ou o valor mensal fixo) — não depende de aula dada ou não. Assignments pagos por porcentagem não entram nessa conta."
      />

      <div className="mb-4">
        <MonthNav basePath="/admin/financial/ferias" year={year} month={month} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow className="hover:bg-secondary">
              <TableHead className="text-base font-bold text-secondary-foreground">Professor</TableHead>
              <TableHead className="text-base font-bold text-secondary-foreground">Mensal</TableHead>
              <TableHead className="text-base font-bold text-secondary-foreground">Anual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((t) => (
              <TableRow key={t.teacherId}>
                <TableCell className="p-0">
                  <Link
                    href={`/admin/financial/ferias/${t.teacherId}?month=${monthQuery}`}
                    className="block px-3 py-2.5 hover:underline"
                  >
                    {t.teacherName}
                  </Link>
                </TableCell>
                <TableCell>{formatCurrency(t.monthlyProvision)}</TableCell>
                <TableCell>{formatCurrency(t.annualProvision)}</TableCell>
              </TableRow>
            ))}
            {teachers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  Nenhum professor ativo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {teachers.length > 0 && (
            <TableFooter className="bg-secondary">
              <TableRow className="hover:bg-secondary">
                <TableCell className="text-base font-bold text-secondary-foreground">Total</TableCell>
                <TableCell className="text-base font-bold text-secondary-foreground">
                  {formatCurrency(totals.monthly)}
                </TableCell>
                <TableCell className="text-base font-bold text-secondary-foreground">
                  {formatCurrency(totals.annual)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
