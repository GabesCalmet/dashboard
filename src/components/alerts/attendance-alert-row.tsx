"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { resolveStudentAlert } from "@/server/actions/alerts";
import { formatDateTime, lessonStatusLabel } from "@/lib/labels";
import type { AttendanceAlert } from "@/server/queries/alerts";

export function AttendanceAlertRow({
  alert,
  studentHref,
}: {
  alert: AttendanceAlert;
  studentHref: string;
}) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function resolve() {
    startTransition(async () => {
      try {
        await resolveStudentAlert(alert.studentId, note);
        toast.success("Alerta resolvido.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao resolver alerta.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link href={studentHref} className="font-medium hover:underline">
              {alert.studentName}
            </Link>
            {alert.teacherName && (
              <p className="text-xs text-muted-foreground">Prof. {alert.teacherName}</p>
            )}
          </div>
          <Badge variant={alert.severity === "RED" ? "destructive" : "warning"}>
            {alert.severity === "RED" ? "Crítico" : "Atenção"}
          </Badge>
        </div>

        <p className="text-sm">{alert.reason}</p>

        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {alert.lessons.map((l) => (
            <li key={l.id}>
              {formatDateTime(l.scheduledAt)} — {lessonStatusLabel[l.status]}
            </li>
          ))}
        </ul>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="O que aconteceu?"
          rows={2}
        />

        <Button size="sm" variant="outline" onClick={resolve} disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Resolver alerta
        </Button>
      </CardContent>
    </Card>
  );
}
