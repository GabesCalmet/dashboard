import Link from "next/link";
import { Cake } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BirthdayCardDialog } from "@/components/alerts/birthday-card-dialog";
import { formatCalendarDate } from "@/lib/labels";
import type { BirthdayAlert } from "@/server/queries/alerts";

export function BirthdayAlertsView({
  alerts,
  studentsBasePath,
}: {
  alerts: BirthdayAlert[];
  studentsBasePath: string;
}) {
  return (
    <div>
      <PageHeader
        title="Aniversários"
        description="Alunos ativos fazendo aniversário hoje."
      />

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum aniversário hoje.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <Card key={alert.studentId} className="border-success/40 bg-success/5">
              <CardContent className="flex items-start gap-3 pt-6">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                  <Cake className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`${studentsBasePath}/${alert.studentId}`} className="font-medium hover:underline">
                    {alert.studentName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Completando {alert.turningAge} anos hoje
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCalendarDate(alert.birthDate)}</p>
                  <div className="mt-3">
                    <BirthdayCardDialog studentName={alert.studentName} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
