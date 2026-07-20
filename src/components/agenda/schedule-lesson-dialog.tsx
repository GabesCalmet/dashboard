"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { scheduleLesson } from "@/server/actions/lessons";
import { useActionToast } from "@/hooks/use-action-toast";

type Option = { id: string; label: string };

export function ScheduleLessonDialog({
  students,
  teachers,
  fixedTeacherId,
}: {
  students: Option[];
  teachers: Option[];
  fixedTeacherId?: string;
}) {
  const [state, formAction, isPending] = useActionState(scheduleLesson, undefined);
  const [open, setOpen] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nova aula
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar aula</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Aluno</Label>
            <Select name="studentId" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o aluno" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fixedTeacherId ? (
            <input type="hidden" name="teacherId" value={fixedTeacherId} />
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Professor</Label>
              <Select name="teacherId" required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o professor" />
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
          )}

          <div className="space-y-1.5">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time">Horário</Label>
            <Input id="time" name="time" type="time" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="durationMin">Duração (min)</Label>
            <Input id="durationMin" name="durationMin" type="number" defaultValue={50} required />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
