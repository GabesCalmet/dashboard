"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { History, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveStudentAlert, setAlertBoardStatus } from "@/server/actions/alerts";
import { formatDateTime, lessonStatusLabel } from "@/lib/labels";
import { stripTeacherWord } from "@/lib/teacher-order";
import type { AttendanceAlert } from "@/server/queries/alerts";

// A live alert always sits on Pendente, Aguardando resposta do professor,
// or Ação necessária — Resolvido and Ação não necessária aren't values
// this select ever actually sits on, they're one-way triggers that remove
// the card from the board entirely (see resolveStudentAlert), so the card
// disappears the moment either is chosen rather than updating in place
// like the other three. The only difference between them: Resolvido
// carries whatever note is in the box below, Ação não necessária always
// resolves with its own fixed note instead — there's nothing to explain,
// so nothing to type first.
type SelectableStatus =
  | "PENDENTE"
  | "AGUARDANDO_RESPOSTA_PROFESSOR"
  | "ACAO_NECESSARIA"
  | "RESOLVIDO"
  | "ACAO_NAO_NECESSARIA";

export function AttendanceAlertRow({
  alert,
  studentHref,
  historyHref,
}: {
  alert: AttendanceAlert;
  studentHref: string;
  historyHref: string;
}) {
  const [note, setNote] = useState(alert.actionNote ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleStatusChange(value: SelectableStatus) {
    startTransition(async () => {
      try {
        if (value === "RESOLVIDO" || value === "ACAO_NAO_NECESSARIA") {
          await resolveStudentAlert(
            alert.studentId,
            value === "ACAO_NAO_NECESSARIA" ? "Ação não necessária" : note,
            {
              severity: alert.severity,
              reason: alert.reason,
              lessons: alert.lessons,
            }
          );
          toast.success("Alerta resolvido.");
        } else {
          // The note carries over with the status change instead of
          // being left behind — it's the same working note throughout
          // the alert's life on the board, not reset at each column.
          await setAlertBoardStatus(alert.studentId, value, note);
          toast.success("Status do alerta atualizado.");
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar alerta.");
      }
    });
  }

  function handleSaveNote() {
    startTransition(async () => {
      try {
        await setAlertBoardStatus(alert.studentId, alert.boardStatus, note);
        toast.success("Nota salva.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar nota.");
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
        {note !== (alert.actionNote ?? "") && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={handleSaveNote}>
            <Save />
            Salvar nota
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={alert.boardStatus}
            disabled={isPending}
            onValueChange={(value) => handleStatusChange(value as SelectableStatus)}
          >
            <SelectTrigger size="sm" className="w-[220px]">
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="AGUARDANDO_RESPOSTA_PROFESSOR">Aguardando resposta do professor</SelectItem>
              <SelectItem value="ACAO_NECESSARIA">Ação necessária</SelectItem>
              <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
              <SelectItem value="ACAO_NAO_NECESSARIA">Ação não necessária</SelectItem>
            </SelectContent>
          </Select>
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
