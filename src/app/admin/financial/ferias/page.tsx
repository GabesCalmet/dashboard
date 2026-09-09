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
import { getTeacherFeriasForYear } from "@/server/queries/teachers";
import { formatCurrency } from "@/lib/labels";

export default async function AdminFeriasPage() {
  const now = new Date();
  const { teachers, totals } = await getTeacherFeriasForYear(now.getFullYear(), now.getMonth());

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

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Mensal previsto</TableHead>
              <TableHead>Mensal realizado</TableHead>
              <TableHead>Anual previsto</TableHead>
              <TableHead>Anual realizado</TableHead>
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
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell>{formatCurrency(totals.monthlyPrevisto)}</TableCell>
                <TableCell>{formatCurrency(totals.monthlyRealizado)}</TableCell>
                <TableCell>{formatCurrency(totals.annualPrevisto)}</TableCell>
                <TableCell>{formatCurrency(totals.annualRealizado)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
