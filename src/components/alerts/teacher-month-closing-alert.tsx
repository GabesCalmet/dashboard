"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TeacherMonthClosingAlert } from "@/server/queries/alerts";

// Only ever rendered in the last 3 days of the month (see
// getTeacherMonthClosingAlert) — a reminder that these already-happened
// classes still need their outcome reported before the month closes and
// payroll is calculated off of it. Collapsed by default, same pattern as
// TeacherRescheduleAlerts.
export function TeacherMonthClosingAlert({
  alerts,
  studentsBasePath,
}: {
  alerts: TeacherMonthClosingAlert[];
  studentsBasePath: string;
}) {
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) return null;

  const totalLessons = alerts.reduce((sum, a) => sum + a.lessons.length, 0);
  const monthLabel = alerts[0].monthLabel;

  return (
    <Card className="overflow-hidden border-red-500/40 bg-red-500/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock className="size-4 text-red-600" />
          Aulas sem registro antes do fechamento de {monthLabel}
          <Badge variant="destructive">
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
                <Badge variant="destructive">
                  {alert.lessons.length} aula{alert.lessons.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {alert.lessons.map((l) => (
                  <li key={l.id}>{formatDateTime(l.scheduledAt)}</li>
                ))}
              </ul>
            </Link>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
