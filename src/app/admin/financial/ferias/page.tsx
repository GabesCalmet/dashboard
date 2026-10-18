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
import { parseMonthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function AdminFeriasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const { teachers, totals } = await getTeacherFeriasForYear(year, month);

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
        description="8,3% do que cada professor ganha, mês a mês — previsto supõe que toda aula marcada aconteça, realizado é só o que já foi dado."
      />

      <div className="mb-4">
        <MonthNav basePath="/admin/financial/ferias" year={year} month={month} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow className="hover:bg-secondary">
              <TableHead className="text-base font-bold text-secondary-foreground">Professor</TableHead>
              <TableHead className="text-base font-bold text-secondary-foreground">Mensal previsto</TableHead>
              <TableHead className="text-base font-bold text-secondary-foreground">Mensal atual</TableHead>
              <TableHead className="text-base font-bold text-secondary-foreground">Anual previsto</TableHead>
              <TableHead className="text-base font-bold text-secondary-foreground">Anual atual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((t) => (
              <TableRow key={t.teacherId}>
                <TableCell className="p-0">
                  <Link
                    href={`/admin/teachers/${t.teacherId}`}
                    className="block px-3 py-2.5 hover:underline"
                  >
                    {t.teacherName}
                  </Link>
                </TableCell>
                <TableCell>{formatCurrency(t.monthlyProvisionPrevisto)}</TableCell>
                <TableCell>{formatCurrency(t.monthlyProvisionRealizado)}</TableCell>
                <TableCell>{formatCurrency(t.annualProvisionPrevisto)}</TableCell>
                <TableCell>{formatCurrency(t.annualProvisionRealizado)}</TableCell>
              </TableRow>
            ))}
            {teachers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
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
                  {formatCurrency(totals.monthlyPrevisto)}
                </TableCell>
                <TableCell className="text-base font-bold text-secondary-foreground">
                  {formatCurrency(totals.monthlyRealizado)}
                </TableCell>
                <TableCell className="text-base font-bold text-secondary-foreground">
                  {formatCurrency(totals.annualPrevisto)}
                </TableCell>
                <TableCell className="text-base font-bold text-secondary-foreground">
                  {formatCurrency(totals.annualRealizado)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
