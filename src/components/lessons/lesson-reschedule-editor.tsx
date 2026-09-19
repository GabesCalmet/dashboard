"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addLessonReschedule } from "@/server/actions/lessons";
import { formatDateTime } from "@/lib/labels";
import type { LessonStatus } from "@prisma/client";

export type RescheduledToEntry = {
  id: string;
  scheduledAt: Date;
  durationMin: number;
  status: LessonStatus;
};

type Draft = { key: number; date: string; time: string; endTime: string };

let nextDraftKey = 0;
function emptyDraft(): Draft {
  return { key: nextDraftKey++, date: "", time: "", endTime: "" };
}

// Books one or more new reposições against a canceled lesson — each saved
// date/time becomes its own "Reposição Marcada" row in Histórico de aulas,
// where its outcome (Reposição Dada / Não Compareceu) is set later. This
// dialog only ever adds new dates; it doesn't show or edit ones already
// booked (those live and are managed in Histórico de aulas itself). The
// "+" button adds another blank date/time block for when a single
// cancellation needs to be split across more than one day (e.g. a 90min
// class replaced by two 45min sessions). All filled blocks are booked
// together on "Salvar".
export function LessonRescheduleEditor({
  lessonId,
  rescheduledTo,
}: {
  lessonId: string;
  rescheduledTo: RescheduledToEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const [isPending, startTransition] = useTransition();

  const triggerLabel =
    rescheduledTo.length === 0
      ? "Agendar reposição"
      : rescheduledTo.length === 1
        ? formatDateTime(rescheduledTo[0].scheduledAt)
        : `${rescheduledTo.length} reposições agendadas`;

  function updateDraft(key: number, field: "date" | "time" | "endTime", value: string) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, [field]: value } : d)));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, emptyDraft()]);
  }

  function save() {
    const filled = drafts.filter((d) => d.date && d.time && d.endTime);
    startTransition(async () => {
      try {
        for (const d of filled) {
          await addLessonReschedule(lessonId, { date: d.date, time: d.time, endTime: d.endTime });
        }
        toast.success(filled.length > 1 ? "Reposições salvas." : "Reposição salva.");
        setDrafts([emptyDraft()]);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar reposição.");
      }
    });
  }

  const canSave = drafts.some((d) => d.date && d.time && d.endTime);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-left text-sm text-muted-foreground hover:text-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendamento</DialogTitle>
          <DialogDescription>
            Escolha a nova data e horário da reposição. Use o botão de adicionar caso mais de um
            dia seja necessário para repor esta aula.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {drafts.map((d) => (
            <div key={d.key} className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={`reschedule-date-${d.key}`}>Data</Label>
                <Input
                  id={`reschedule-date-${d.key}`}
                  type="date"
                  value={d.date}
                  onChange={(e) => updateDraft(d.key, "date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`reschedule-time-${d.key}`}>Início</Label>
                <Input
                  id={`reschedule-time-${d.key}`}
                  type="time"
                  value={d.time}
                  onChange={(e) => updateDraft(d.key, "time", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`reschedule-end-time-${d.key}`}>Término</Label>
                <Input
                  id={`reschedule-end-time-${d.key}`}
                  type="time"
                  value={d.endTime}
                  onChange={(e) => updateDraft(d.key, "endTime", e.target.value)}
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addDraft}>
            <Plus className="size-3.5" /> Adicionar outra data
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={isPending || !canSave}>
            {isPending && <Loader2 className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
