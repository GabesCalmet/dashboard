"use client";

import { useActionState, useState } from "react";
import { Loader2, Ban } from "lucide-react";
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
import { LessonScheduleEditor, type ScheduleEntry } from "@/components/students/lesson-schedule-editor";
import { updateTeacherBlockedSlots } from "@/server/actions/teachers";
import { useActionToast } from "@/hooks/use-action-toast";

// Lets a teacher mark recurring weekly windows they're not available —
// reuses the same weekday/time editor a student's class schedule is built
// with, since the data shape is identical. Visual-only for now (shown as a
// shaded background on the Agenda calendar and read-only on the admin's
// teacher profile) — doesn't stop anyone from scheduling into it.
export function TeacherBlockedSlotsDialog({ defaultValue }: { defaultValue: ScheduleEntry[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(updateTeacherBlockedSlots, undefined);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Ban className="size-4" /> Bloquear horários
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Horários bloqueados</DialogTitle>
          <DialogDescription>
            Marque os horários em que você não está disponível. Eles aparecem sombreados na sua
            Agenda só para referência — isso ainda não impede que uma aula seja marcada nesse
            horário.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <LessonScheduleEditor name="blockedSlots" defaultValue={defaultValue} />

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
