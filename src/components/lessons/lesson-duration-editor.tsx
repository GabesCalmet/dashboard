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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLessonDuration } from "@/server/actions/lessons";

// Lets an admin correct a lesson's own duration directly — feeds straight
// into payroll (hours × rate) and the student's hour totals, so this is a
// real figure, not cosmetic.
export function LessonDurationEditor({
  lessonId,
  durationMin,
}: {
  lessonId: string;
  durationMin: number;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(durationMin));
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) setValue(String(durationMin));
    setOpen(next);
  }

  function submit() {
    startTransition(async () => {
      try {
        await updateLessonDuration(lessonId, Number(value));
        toast.success("Duração da aula atualizada.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar duração.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-left hover:text-foreground">
          <span>{durationMin} min</span>
          <Pencil className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duração da aula</DialogTitle>
          <DialogDescription>Em minutos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor={`lesson-duration-${lessonId}`}>Minutos</Label>
          <Input
            id={`lesson-duration-${lessonId}`}
            type="number"
            min={1}
            max={600}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={isPending || !value || Number(value) <= 0}>
            {isPending && <Loader2 className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
