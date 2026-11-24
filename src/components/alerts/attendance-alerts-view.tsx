import Link from "next/link";
import { History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceAlertRow } from "@/components/alerts/attendance-alert-row";
import { TeacherCountBarChart } from "@/components/alerts/teacher-count-bar-chart";
import { stripTeacherWord } from "@/lib/teacher-order";
import type { AttendanceAlert } from "@/server/queries/alerts";
import type { getTeacherCancellationBreakdown } from "@/server/queries/teachers";

export function AttendanceAlertsView({
  alerts,
  cancellationBreakdown,
  studentsBasePath,
  historyBasePath,
}: {
  alerts: AttendanceAlert[];
  cancellationBreakdown: Awaited<ReturnType<typeof getTeacherCancellationBreakdown>>;
  studentsBasePath: string;
  historyBasePath: string;
}) {
  const breakdown = cancellationBreakdown.map((r) => ({
    ...r,
    teacherName: stripTeacherWord(r.teacherName),
  }));
  const noShowData = breakdown.map((r) => ({ name: r.teacherName, value: r.noShow }));
  const canceledLateData = breakdown.map((r) => ({ name: r.teacherName, value: r.canceledLate }));
  const canceledByStudentData = breakdown.map((r) => ({ name: r.teacherName, value: r.canceledByStudent }));
  const canceledByTeacherData = breakdown.map((r) => ({ name: r.teacherName, value: r.canceledByTeacher }));

  return (
    <div>
      <PageHeader
        title="Alertas de frequência"
        description="Alunos com 2 cancelamentos/faltas no mês, ou 2 aulas seguidas canceladas/faltadas."
        actions={
          <Button variant="outline" asChild>
            <Link href={historyBasePath}>
              <History />
              Histórico de alertas
            </Link>
          </Button>
        }
      />

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum alerta no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {alerts.map((alert) => (
            <AttendanceAlertRow
              key={alert.studentId}
              alert={alert}
              studentHref={`${studentsBasePath}/${alert.studentId}`}
              historyHref={`${historyBasePath}?studentId=${alert.studentId}`}
            />
          ))}
        </div>
      )}

      <h2 className="mt-8 mb-4 text-lg font-semibold">Cancelamentos por professor (mês)</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Não compareceu</CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherCountBarChart rows={noShowData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cancelamento tarde</CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherCountBarChart rows={canceledLateData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cancelamento do aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherCountBarChart rows={canceledByStudentData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cancelamento do professor</CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherCountBarChart rows={canceledByTeacherData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
