"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addStudentClassPeriod } from "@/server/actions/students";
import { useActionToast } from "@/hooks/use-action-toast";
import { WeekdayTimeGridEditor } from "@/components/students/weekday-time-grid-editor";
import type { TeacherPayMode } from "@/components/students/teacher-assignment-editor";

// A clean new "mini-contract" — separate from "Editar" (which opens the
// full existing history for manual correction). This always starts blank:
// pick a new teacher, a new weekly schedule, a new aulas/mês, one shared
// vigência for all of it. addStudentClassPeriod does the bookkeeping of
// closing out whatever was still open before appending these, so a
// student who paused and came back (or just switched teachers) gets a
// clean new period instead of a hand-edited gap in the old one.
export function StudentNewClassPeriodDialog({ studentId, teachers }: {
  studentId: string;
  teachers: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TeacherPayMode>("HOURLY");
  const [state, formAction, isPending] = useActionState(
    addStudentClassPeriod.bind(null, studentId),
    undefined
  );
  useActionToast(state, () => setOpen(false));

  function handleOpenChange(next: boolean) {
    if (next) setMode("HOURLY");
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Adicionar aula
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar aula</DialogTitle>
          <DialogDescription>
            Inicia um período novo — professor, horário e aulas/mês próprios, com vigência
            definida aqui. Qualquer professor/horário/aulas-mês ainda em aberto é encerrado
            automaticamente um dia antes do início escolhido.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="periodFrom">Início</Label>
              <DateInput id="periodFrom" name="periodFrom" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodUntil">Fim (opcional)</Label>
              <DateInput id="periodUntil" name="periodUntil" placeholder="Em aberto" />
            </div>
            <div className="w-24 space-y-1.5">
              <Label htmlFor="lessonsPerMonth">Aulas/mês</Label>
              <Input id="lessonsPerMonth" name="lessonsPerMonth" type="number" min={0} step="1" defaultValue={4} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meetLink">Link do Google Meet (opcional)</Label>
            <Input id="meetLink" name="meetLink" type="url" placeholder="https://meet.google.com/..." />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-xs font-normal text-muted-foreground">Professor</Label>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-40 space-y-1.5">
                <Select name="teacherId" required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant={mode === "HOURLY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("HOURLY")}
                >
                  Por hora
                </Button>
                <Button
                  type="button"
                  variant={mode === "MONTHLY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("MONTHLY")}
                >
                  Mensal fixo
                </Button>
                <Button
                  type="button"
                  variant={mode === "PERCENTAGE" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("PERCENTAGE")}
                >
                  Percentual
                </Button>
              </div>

              <input type="hidden" name="teacherPayMode" value={mode} />

              {mode === "HOURLY" && (
                <div className="w-24 space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground">R$/hora</Label>
                  <Input name="teacherPayRate" type="number" step="0.01" min={0} defaultValue={0} />
                </div>
              )}
              {mode === "MONTHLY" && (
                <div className="w-24 space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground">R$/mês</Label>
                  <Input name="teacherMonthlyAmount" type="number" step="0.01" min={0} defaultValue={0} />
                </div>
              )}
              {mode === "PERCENTAGE" && (
                <div className="w-20 space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground">%</Label>
                  <Input name="teacherPercentage" type="number" step="0.1" min={0} max={100} defaultValue={0} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dia(s) e horário(s) da(s) aula(s)</Label>
            <WeekdayTimeGridEditor name="schedule" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Criar período
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
