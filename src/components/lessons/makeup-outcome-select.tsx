"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setMakeupOutcome } from "@/server/actions/lessons";
import { makeupOutcomeOptions, makeupOutcomeLabel, type MakeupOutcome } from "@/lib/labels";

// Lets a teacher/admin resolve a booked reposição to one of its 3 states —
// Reposição Marcada (still just booked), Reposição Dada, or Reposição Não
// Compareceu — directly from its own row in Histórico de aulas/Relatórios,
// the only place this is set. Both resolved states count toward the
// Reposições boxes and as a class given for teacher payroll.
export function MakeupOutcomeSelect({
  makeupLessonId,
  status,
}: {
  makeupLessonId: string;
  status: MakeupOutcome;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await setMakeupOutcome(makeupLessonId, value as MakeupOutcome);
            toast.success("Reposição atualizada.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar reposição.");
          }
        })
      }
    >
      <SelectTrigger size="sm" className="w-[210px]">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {makeupOutcomeOptions.map((option) => (
          <SelectItem key={option} value={option}>
            {makeupOutcomeLabel[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
