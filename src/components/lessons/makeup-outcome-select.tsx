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
import { setMakeupOutcome, cancelLessonReschedule } from "@/server/actions/lessons";
import { makeupOutcomeOptions, makeupOutcomeLabel, type MakeupOutcome } from "@/lib/labels";

const CANCEL_VALUE = "CANCEL_RESCHEDULE";

// Lets a teacher/admin resolve a booked reposição to one of its 3 states —
// Reposição Marcada (still just booked), Reposição Dada, or Reposição Não
// Compareceu — or, while still Marcada, cancel the reagendamento outright
// (deletes this makeup lesson, leaving the original cancellation unresolved
// again). Canceling isn't offered once resolved, so a Dada/Não Compareceu
// row — already paid/counted — can't be deleted by mistake from this
// control. Used both from the Agenda dialog and from a makeup lesson's own
// row in Histórico de aulas/Relatórios — the only places this is set.
export function MakeupOutcomeSelect({
  makeupLessonId,
  status,
  onChange,
  onCanceled,
}: {
  makeupLessonId: string;
  status: MakeupOutcome;
  onChange?: (status: MakeupOutcome) => void;
  onCanceled?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    if (value === status) return;
    startTransition(async () => {
      try {
        if (value === CANCEL_VALUE) {
          await cancelLessonReschedule(makeupLessonId);
          toast.success("Reagendamento cancelado.");
          onCanceled?.();
        } else {
          const next = value as MakeupOutcome;
          await setMakeupOutcome(makeupLessonId, next);
          toast.success("Reposição atualizada.");
          onChange?.(next);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar reposição.");
      }
    });
  }

  return (
    <Select value={status} disabled={isPending} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="w-[210px]">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {makeupOutcomeOptions.map((option) => (
          <SelectItem key={option} value={option}>
            {makeupOutcomeLabel[option]}
          </SelectItem>
        ))}
        {status === "MAKEUP" && (
          <SelectItem value={CANCEL_VALUE} className="text-destructive focus:text-destructive">
            Cancelar Reagendamento
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
