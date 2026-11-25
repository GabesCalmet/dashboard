"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { resolveStudentAlert } from "@/server/actions/alerts";
import { formatDateTime, lessonStatusLabel } from "@/lib/labels";
import { stripTeacherWord } from "@/lib/teacher-order";
import type { AttendanceAlert } from "@/server/queries/alerts";

export function AttendanceAlertRow({
  alert,
  studentHref,
  historyHref,
}: {
  alert: AttendanceAlert;
  studentHref: string;
  historyHref: string;
}) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function resolve() {
    startTransition(async () => {
      try {
        await resolveStudentAlert(alert.studentId, note, {
          severity: alert.severity,
          reason: alert.reason,
          lessons: alert.lessons,
        });
        toast.success("Alerta resolvido.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao resolver alerta.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-1.5">
          <div className="min-w-0">
            <Link href={studentHref} className="truncate font-medium hover:underline">
              {alert.studentName}
            </Link>
            {alert.teacherName && (
              <p className="truncate text-xs text-muted-foreground">
                Prof. {stripTeacherWord(alert.teacherName)}
              </p>
            )}
          </div>
          <Badge variant={alert.severity === "RED" ? "destructive" : "warning"} className="shrink-0">
            {alert.severity === "RED" ? "Crítico" : "Atenção"}
          </Badge>
        </div>

        <p className="text-xs">{alert.reason}</p>

        <ul className="space-y-1 text-xs text-muted-foreground">
          {alert.lessons.map((l) => (
            <li key={l.id}>
              <p>
                {formatDateTime(l.scheduledAt)} — {lessonStatusLabel[l.status]}
              </p>
              {l.observations && <p className="pl-2 italic">&quot;{l.observations}&quot;</p>}
            </li>
          ))}
        </ul>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="O que aconteceu?"
          rows={2}
          className="text-xs"
        />

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={resolve} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Resolver
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href={historyHref}>
              <History />
              Histórico
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
