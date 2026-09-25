import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MonthNav } from "@/components/financial/month-nav";
import { TeacherPayoutCell } from "@/components/financial/teacher-payout-cell";
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
import { getTeacherPayoutEntriesByTeacher } from "@/server/queries/payouts";
import { parseMonthParam, monthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function AdminTeacherPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const [{ rows, totals }, entriesByTeacher] = await Promise.all([
    getTeacherPayrollForMonth(year, month),
    getTeacherPayoutEntriesByTeacher(year, month),
  ]);
  const monthQuery = monthParam(year, month);
  const totalRealizado = [...entriesByTeacher.values()]
    .flat()
    .reduce((sum, p) => sum + Number(p.amount), 0);

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
        description="Previsto (todas as aulas do mês), acumulado (o que já é devido pelas aulas dadas até hoje) e realizado (o que já foi registrado como pago — use o + para lançar um pagamento, inclusive em partes)."
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
              <TableHead>Acumulado</TableHead>
              <TableHead>Realizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.teacherId}>
                <TableCell className="p-0">
                  <Link
                    href={`/admin/financial/gastos/professores/${r.teacherId}?month=${monthQuery}`}
                    className="block px-3 py-2.5 hover:underline"
                  >
                    {r.teacherName}
                  </Link>
                </TableCell>
                <TableCell>{formatCurrency(r.previsto)}</TableCell>
                <TableCell>{formatCurrency(r.realizado)}</TableCell>
                <TableCell>
                  <TeacherPayoutCell
                    teacherId={r.teacherId}
                    year={year}
                    month={month}
                    previsto={r.previsto}
                    entries={(entriesByTeacher.get(r.teacherId) ?? []).map((p) => ({
                      id: p.id,
                      amount: Number(p.amount),
                      paidAt: p.paidAt,
                      bankAccount: p.bankAccount,
                    }))}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
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
                <TableCell>{formatCurrency(totalRealizado)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
