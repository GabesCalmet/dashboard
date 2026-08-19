import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceAlertRow } from "@/components/alerts/attendance-alert-row";
import type { AttendanceAlert } from "@/server/queries/alerts";

export function AttendanceAlertsView({
  alerts,
  studentsBasePath,
}: {
  alerts: AttendanceAlert[];
  studentsBasePath: string;
}) {
  return (
    <div>
      <PageHeader
        title="Alertas de frequência"
        description="Alunos com 2 cancelamentos/faltas no mês, ou 2 aulas seguidas canceladas/faltadas."
      />

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum alerta no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {alerts.map((alert) => (
            <AttendanceAlertRow
              key={alert.studentId}
              alert={alert}
              studentHref={`${studentsBasePath}/${alert.studentId}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
