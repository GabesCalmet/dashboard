"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, X } from "lucide-react";
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
import { scheduleLessonReschedule, clearLessonReschedule } from "@/server/actions/lessons";
import { formatDateTime } from "@/lib/labels";

export function LessonRescheduleEditor({
  lessonId,
  rescheduledTo,
}: {
  lessonId: string;
  rescheduledTo: { scheduledAt: Date; durationMin: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(rescheduledTo ? toDateInput(rescheduledTo.scheduledAt) : "");
  const [time, setTime] = useState(rescheduledTo ? toTimeInput(rescheduledTo.scheduledAt) : "");
  const [endTime, setEndTime] = useState(
    rescheduledTo ? toTimeInput(addMinutes(rescheduledTo.scheduledAt, rescheduledTo.durationMin)) : ""
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await scheduleLessonReschedule(lessonId, { date, time, endTime });
        toast.success("Reagendamento salvo.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar reagendamento.");
      }
    });
  }

  function clear() {
    startTransition(async () => {
      try {
        await clearLessonReschedule(lessonId);
        toast.success("Reagendamento removido.");
        setDate("");
        setTime("");
        setEndTime("");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao remover reagendamento.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-left text-sm text-muted-foreground hover:text-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          {rescheduledTo ? formatDateTime(rescheduledTo.scheduledAt) : "Agendar reposição"}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendamento</DialogTitle>
          <DialogDescription>Escolha a nova data e horário da reposição.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-date">Data</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-time">Início</Label>
            <Input
              id="reschedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-end-time">Término</Label>
            <Input
              id="reschedule-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {rescheduledTo ? (
            <Button type="button" variant="outline" onClick={clear} disabled={isPending}>
              <X /> Remover
            </Button>
          ) : (
            <span />
          )}
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
