import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { TeacherFormDialog } from "@/components/teachers/teacher-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { TeacherRevenueChart } from "@/components/teachers/teacher-revenue-chart";
import { TeacherHoursChart } from "@/components/teachers/teacher-hours-chart";
import { TeacherCancellationChart } from "@/components/teachers/teacher-cancellation-chart";
import { listTeachers, getTeacherMonthlyPerformance } from "@/server/queries/teachers";
import { getTeacherPayoutEntriesByTeacher } from "@/server/queries/payouts";
import { parseMonthParam, monthParam } from "@/lib/month-param";
import { formatCurrency } from "@/lib/labels";

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);
  const [teachers, performance, payoutsByTeacher] = await Promise.all([
    listTeachers(),
    getTeacherMonthlyPerformance(year, month),
    getTeacherPayoutEntriesByTeacher(year, month),
  ]);
  const monthQuery = monthParam(year, month);
  const totalPago = [...payoutsByTeacher.values()]
    .flat()
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPrevisto = performance.reduce((sum, r) => sum + r.previsto, 0);
  const totalRealizado = performance.reduce((sum, r) => sum + r.realizado, 0);

  const byRevenue = [...performance].sort((a, b) => b.realizado - a.realizado);
  const byHours = [...performance].sort((a, b) => b.hoursTaught - a.hoursTaught);
  const byCancellation = [...performance].sort((a, b) => b.cancellationRate - a.cancellationRate);

  return (
    <div>
      <PageHeader
        title="Professores"
        description={`${teachers.length} professores cadastrados`}
        actions={<TeacherFormDialog />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map((t) => (
          <Link key={t.id} href={`/admin/teachers/${t.id}`}>
            <Card className="transition-colors hover:border-accent/50">
              <CardContent className="flex items-start gap-3 pt-1">
                <Avatar className="size-11">
                  {t.user.avatarUrl && <AvatarImage src={t.user.avatarUrl} />}
                  <AvatarFallback>{t.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{t.user.name}</p>
                    <Badge variant={t.user.active ? "success" : "outline"}>
                      {t.user.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">@{t.user.username}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.specialties.slice(0, 3).map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span>{t.activeStudents} alunos ativos</span>
                    <span>
                      {t.actualLessonsThisMonth}/{t.expectedLessonsThisMonth} aulas (mês)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {teachers.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            Nenhum professor cadastrado ainda.
          </p>
        )}
      </div>

      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pagamentos e desempenho</h2>
        <MonthNav basePath="/admin/teachers" year={year} month={month} />
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Previsto por hora</TableHead>
              <TableHead>Acumulado</TableHead>
              <TableHead>Pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performance.map((r) => (
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
                  {formatCurrency(
                    (payoutsByTeacher.get(r.teacherId) ?? []).reduce(
                      (sum, p) => sum + Number(p.amount),
                      0
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
            {performance.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nenhum professor ativo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {performance.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell>{formatCurrency(totalPrevisto)}</TableCell>
                <TableCell>{formatCurrency(totalRealizado)}</TableCell>
                <TableCell>{formatCurrency(totalPago)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {performance.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Professores por recebimento</CardTitle>
            </CardHeader>
            <CardContent>
              <TeacherRevenueChart rows={byRevenue} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Professores por horas lecionadas</CardTitle>
            </CardHeader>
            <CardContent>
              <TeacherHoursChart rows={byHours} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cancelamentos e reposições por professor</CardTitle>
            </CardHeader>
            <CardContent>
              <TeacherCancellationChart rows={byCancellation} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
