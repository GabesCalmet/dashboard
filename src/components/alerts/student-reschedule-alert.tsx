import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, lessonStatusLabel } from "@/lib/labels";
import type { TeacherRescheduleAlert } from "@/server/queries/alerts";

// Same "aulas sem reposição" signal as the teacher dashboard's collapsible
// TeacherRescheduleAlerts, narrowed to the one student being viewed — shown
// inline on that student's own page instead of in a list of every student,
// so no outer link/collapse is needed here, just the lesson list itself.
export function StudentRescheduleAlert({ alert }: { alert: TeacherRescheduleAlert | null }) {
  if (!alert) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="space-y-2 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <span className="text-sm font-semibold">Aulas sem reposição agendada</span>
          <Badge variant="warning">
            {alert.lessons.length} aula{alert.lessons.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {alert.lessons.map((l) => (
            <li key={l.id}>
              {formatDateTime(l.scheduledAt)} — {lessonStatusLabel[l.status]}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
