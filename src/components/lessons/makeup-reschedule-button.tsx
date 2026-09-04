"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
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
import { rescheduleMakeupLesson } from "@/server/actions/lessons";

// Moves a reposição's own date/time — as opposed to LessonRescheduleEditor,
// which books a separate makeup lesson for a canceled one, this just
// updates the reposição itself in place. Closes via onRescheduled instead
// of local state so the dialog's own Data/Horário fields (which show this
// same lesson) get refreshed too, instead of going stale.
export function MakeupRescheduleButton({
  lessonId,
  scheduledAt,
  durationMin,
  onRescheduled,
}: {
  lessonId: string;
  scheduledAt: Date;
  durationMin: number;
  onRescheduled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toDateInput(scheduledAt));
  const [time, setTime] = useState(toTimeInput(scheduledAt));
  const [endTime, setEndTime] = useState(toTimeInput(addMinutes(scheduledAt, durationMin)));
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await rescheduleMakeupLesson(lessonId, { date, time, endTime });
        toast.success("Reposição reagendada.");
        setOpen(false);
        onRescheduled?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao reagendar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-left text-sm text-muted-foreground hover:text-foreground">
          <CalendarClock className="size-3.5 shrink-0" /> Reagendar
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendar reposição</DialogTitle>
          <DialogDescription>Escolha a nova data e horário desta reposição.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="makeup-reschedule-date">Data</Label>
            <Input
              id="makeup-reschedule-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="makeup-reschedule-time">Início</Label>
            <Input
              id="makeup-reschedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="makeup-reschedule-end-time">Término</Label>
            <Input
              id="makeup-reschedule-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={isPending || !date || !time || !endTime}>
            {isPending && <Loader2 className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
