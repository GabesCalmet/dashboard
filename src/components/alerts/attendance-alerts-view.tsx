import Link from "next/link";
import { History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceAlertRow } from "@/components/alerts/attendance-alert-row";
import type { AttendanceAlert } from "@/server/queries/alerts";

export function AttendanceAlertsView({
  alerts,
  studentsBasePath,
  historyBasePath,
}: {
  alerts: AttendanceAlert[];
  studentsBasePath: string;
  historyBasePath: string;
}) {
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
    </div>
  );
}
