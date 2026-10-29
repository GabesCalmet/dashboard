import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, lessonStatusLabel } from "@/lib/labels";
import type { TeacherRescheduleAlert } from "@/server/queries/alerts";

// A teacher-facing reminder, not the admin "Alertas de frequência" view —
// here it's "these classes still need a reposição booked", so it's silent
// when empty rather than confirming "tudo certo".
export function TeacherRescheduleAlerts({
  alerts,
  studentsBasePath,
}: {
  alerts: TeacherRescheduleAlert[];
  studentsBasePath: string;
}) {
  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-amber-600" />
          Aulas sem reposição agendada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <Link
            key={alert.studentId}
            href={`${studentsBasePath}/${alert.studentId}`}
            className="block rounded-lg border bg-background p-3 transition-colors hover:border-accent/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{alert.studentName}</p>
              <Badge variant="warning">
                {alert.lessons.length} aula{alert.lessons.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {alert.lessons.map((l) => (
                <li key={l.id}>
                  {formatDateTime(l.scheduledAt)} — {lessonStatusLabel[l.status]}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
