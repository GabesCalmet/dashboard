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
import { DateInput } from "@/components/ui/date-input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { addLessonReschedule, rescheduleMakeupLesson } from "@/server/actions/lessons";
import { formatDateTime } from "@/lib/labels";
import { toBrazilDateString, toBrazilTimeString } from "@/lib/timezone";
import type { LessonStatus } from "@prisma/client";

export type RescheduledToEntry = {
  id: string;
  scheduledAt: Date;
  durationMin: number;
  status: LessonStatus;
};

// A draft with an `id` edits that already-booked reposição in place
// (rescheduleMakeupLesson); one without books a brand new one
// (addLessonReschedule).
type Draft = { key: number; id?: string; date: string; time: string; endTime: string };

let nextDraftKey = 0;
function emptyDraft(): Draft {
  return { key: nextDraftKey++, date: "", time: "", endTime: "" };
}

function draftFromEntry(entry: RescheduledToEntry): Draft {
  const end = new Date(entry.scheduledAt.getTime() + entry.durationMin * 60_000);
  return {
    key: nextDraftKey++,
    id: entry.id,
    date: toBrazilDateString(entry.scheduledAt),
    time: toBrazilTimeString(entry.scheduledAt),
    endTime: toBrazilTimeString(end),
  };
}

// Books/edits the reposição(ões) for a canceled lesson. Opening the dialog
// loads whatever's already booked pre-filled with its current date/time —
// editing and saving updates that same reposição in place instead of
// booking an unrelated extra one alongside it. The "+" button still adds a
// blank block for when a single cancellation needs to be split across more
// than one day (e.g. a 90min class replaced by two 45min sessions); only
// blocks with no existing reposição behind them create a new one on save.
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

  function handleOpenChange(next: boolean) {
    if (next) {
      setDrafts(rescheduledTo.length > 0 ? rescheduledTo.map(draftFromEntry) : [emptyDraft()]);
    }
    setOpen(next);
  }

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
          if (d.id) {
            await rescheduleMakeupLesson(d.id, { date: d.date, time: d.time, endTime: d.endTime });
          } else {
            await addLessonReschedule(lessonId, { date: d.date, time: d.time, endTime: d.endTime });
          }
        }
        toast.success(filled.length > 1 ? "Reposições salvas." : "Reposição salva.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar reposição.");
      }
    });
  }

  const canSave = drafts.some((d) => d.date && d.time && d.endTime);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                <DateInput
                  id={`reschedule-date-${d.key}`}
                  value={d.date}
                  onChange={(iso) => updateDraft(d.key, "date", iso)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`reschedule-time-${d.key}`}>Início</Label>
                <TimeInput
                  id={`reschedule-time-${d.key}`}
                  value={d.time}
                  onChange={(v) => updateDraft(d.key, "time", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`reschedule-end-time-${d.key}`}>Término</Label>
                <TimeInput
                  id={`reschedule-end-time-${d.key}`}
                  value={d.endTime}
                  onChange={(v) => updateDraft(d.key, "endTime", v)}
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
