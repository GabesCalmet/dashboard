"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, lessonStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TeacherRescheduleAlert } from "@/server/queries/alerts";

// A teacher-facing reminder, not the admin "Alertas de frequência" view —
// here it's "these classes still need a reposição booked", so it's silent
// when empty rather than confirming "tudo certo". Collapsed by default so
// it doesn't crowd the dashboard — click the yellow bar to see which
// students/lessons it's about.
export function TeacherRescheduleAlerts({
  alerts,
  studentsBasePath,
}: {
  alerts: TeacherRescheduleAlert[];
  studentsBasePath: string;
}) {
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) return null;

  const totalLessons = alerts.reduce((sum, a) => sum + a.lessons.length, 0);

  return (
    <Card className="overflow-hidden border-amber-500/40 bg-amber-500/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-4 text-amber-600" />
          Aulas sem reposição agendada
          <Badge variant="warning">
            {totalLessons} aula{totalLessons === 1 ? "" : "s"} · {alerts.length} aluno
            {alerts.length === 1 ? "" : "s"}
          </Badge>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="space-y-3 pt-0">
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
      )}
    </Card>
  );
}
