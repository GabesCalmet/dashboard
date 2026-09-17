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
import { Checkbox } from "@/components/ui/checkbox";
import {
  addLessonReschedule,
  deleteLessonReschedule,
  rescheduleMakeupLesson,
  setMakeupGiven,
} from "@/server/actions/lessons";
import { formatDateTime } from "@/lib/labels";
import type { LessonStatus } from "@prisma/client";

export type RescheduledToEntry = {
  id: string;
  scheduledAt: Date;
  durationMin: number;
  status: LessonStatus;
};

// Shows every reposição already booked against a canceled lesson (there can
// be more than one — e.g. a 90min class split into two 45min makeups on
// different days) and lets an admin/teacher edit, remove or add another one.
export function LessonRescheduleEditor({
  lessonId,
  rescheduledTo,
}: {
  lessonId: string;
  rescheduledTo: RescheduledToEntry[];
}) {
  const [open, setOpen] = useState(false);

  const triggerLabel =
    rescheduledTo.length === 0
      ? "Agendar reposição"
      : rescheduledTo.length === 1
        ? formatDateTime(rescheduledTo[0].scheduledAt)
        : `${rescheduledTo.length} reposições agendadas`;

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

          <AddRescheduleForm lessonId={lessonId} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Fechar
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
  const [given, setGiven] = useState(entry.status === "COMPLETED");
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

  function toggleGiven(checked: boolean) {
    startTransition(async () => {
      try {
        await setMakeupGiven(entry.id, checked);
        setGiven(checked);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar reposição.");
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
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox
            checked={given}
            disabled={isPending}
            onCheckedChange={(checked) => toggleGiven(checked === true)}
          />
          Dada
        </label>
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

function AddRescheduleForm({ lessonId }: { lessonId: string }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isPending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      try {
        await addLessonReschedule(lessonId, { date, time, endTime });
        toast.success("Reposição adicionada.");
        setDate("");
        setTime("");
        setEndTime("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao adicionar reposição.");
      }
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-xs font-medium text-muted-foreground">Adicionar reposição</p>
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
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={add}
        disabled={isPending || !date || !time || !endTime}
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Adicionar
      </Button>
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
