"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, Plus, X } from "lucide-react";
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
import {
  addLessonReschedule,
  deleteLessonReschedule,
  rescheduleMakeupLesson,
} from "@/server/actions/lessons";
import { formatDateTime, type MakeupOutcome } from "@/lib/labels";
import { MakeupOutcomeSelect } from "@/components/lessons/makeup-outcome-select";
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

// Shows every reposição already booked against a canceled lesson, each
// editable/removable in place, plus one or more blank date/time blocks to
// book new ones — the "+" button adds another blank block for when a single
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

  function removeDraft(key: number) {
    setDrafts((prev) => (prev.length > 1 ? prev.filter((d) => d.key !== key) : prev));
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
          {rescheduledTo.map((entry) => (
            <RescheduleEntryRow key={entry.id} entry={entry} />
          ))}

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
              <div className="flex items-end gap-1.5">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`reschedule-end-time-${d.key}`}>Término</Label>
                  <Input
                    id={`reschedule-end-time-${d.key}`}
                    type="time"
                    value={d.endTime}
                    onChange={(e) => updateDraft(d.key, "endTime", e.target.value)}
                  />
                </div>
                {drafts.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeDraft(d.key)}
                    aria-label="Remover esta data"
                  >
                    <X className="size-4" />
                  </Button>
                )}
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

function RescheduleEntryRow({ entry }: { entry: RescheduledToEntry }) {
  const [date, setDate] = useState(toDateInput(entry.scheduledAt));
  const [time, setTime] = useState(toTimeInput(entry.scheduledAt));
  const [endTime, setEndTime] = useState(
    toTimeInput(addMinutes(entry.scheduledAt, entry.durationMin))
  );
  const [outcome, setOutcome] = useState<MakeupOutcome>(
    entry.status === "COMPLETED" || entry.status === "NO_SHOW" ? entry.status : "MAKEUP"
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await rescheduleMakeupLesson(entry.id, { date, time, endTime });
        toast.success("Reposição atualizada.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar reposição.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteLessonReschedule(entry.id);
        toast.success("Reposição removida.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao remover reposição.");
      }
    });
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-normal text-muted-foreground">Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-normal text-muted-foreground">Início</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-normal text-muted-foreground">Término</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MakeupOutcomeSelect makeupLessonId={entry.id} status={outcome} onChange={setOutcome} />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" /> Remover
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={isPending || !date || !time || !endTime}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

function toDateInput(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function toTimeInput(d: Date) {
  return new Date(d).toTimeString().slice(0, 5);
}

function addMinutes(d: Date, minutes: number) {
  return new Date(new Date(d).getTime() + minutes * 60_000);
}
