"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";
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
import { updateLessonDateTime } from "@/server/actions/lessons";
import { formatDateTime } from "@/lib/labels";
import { toBrazilDateString, toBrazilTimeString } from "@/lib/timezone";

// Lets an admin correct a lesson's own date/time in place — for a mistaken
// entry, not a reagendamento (which books/moves a separate reposição
// instead — see LessonRescheduleEditor).
export function LessonDateTimeEditor({
  lessonId,
  scheduledAt,
}: {
  lessonId: string;
  scheduledAt: Date;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toBrazilDateString(scheduledAt));
  const [time, setTime] = useState(toBrazilTimeString(scheduledAt));
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      setDate(toBrazilDateString(scheduledAt));
      setTime(toBrazilTimeString(scheduledAt));
    }
    setOpen(next);
  }

  function submit() {
    startTransition(async () => {
      try {
        await updateLessonDateTime(lessonId, { date, time });
        toast.success("Data/horário da aula atualizados.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar data/horário.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-left hover:text-foreground">
          <span>{formatDateTime(scheduledAt)}</span>
          <Pencil className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Data e horário da aula</DialogTitle>
          <DialogDescription>Corrige esta aula diretamente — não cria uma reposição.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`lesson-date-${lessonId}`}>Data</Label>
            <DateInput id={`lesson-date-${lessonId}`} value={date} onChange={setDate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`lesson-time-${lessonId}`}>Horário</Label>
            <TimeInput id={`lesson-time-${lessonId}`} value={time} onChange={setTime} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={isPending || !date || !time}>
            {isPending && <Loader2 className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
