"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setMakeupOutcome } from "@/server/actions/lessons";
import { makeupOutcomeOptions, makeupOutcomeLabel, type MakeupOutcome } from "@/lib/labels";

// Lets a teacher/admin resolve a booked reposição to one of its 3 states —
// Reposição marcada (still just booked), Reposição dada, or Reposição não
// compareceu. Both resolved states count toward the Reposições box and as
// a class given for teacher payroll.
export function MakeupOutcomeSelect({
  makeupLessonId,
  status,
  onChange,
}: {
  makeupLessonId: string;
  status: MakeupOutcome;
  onChange?: (status: MakeupOutcome) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function set(next: MakeupOutcome) {
    if (next === status) return;
    startTransition(async () => {
      try {
        await setMakeupOutcome(makeupLessonId, next);
        onChange?.(next);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar reposição.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {makeupOutcomeOptions.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={status === option ? "default" : "outline"}
          disabled={isPending}
          onClick={() => set(option)}
        >
          {makeupOutcomeLabel[option]}
        </Button>
      ))}
      {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}
