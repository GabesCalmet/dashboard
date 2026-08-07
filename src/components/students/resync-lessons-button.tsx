"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resyncStudentLessons } from "@/server/actions/students";

// Forces recurring lesson generation to re-run right now, instead of
// waiting for the next edit or the weekly cron — mainly useful right after
// changing the lesson schedule or course end date, to see the effect
// immediately.
export function ResyncLessonsButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await resyncStudentLessons(studentId);
            toast.success("Aulas recorrentes atualizadas.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar aulas.");
          }
        })
      }
    >
      {isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      Atualizar aulas
    </Button>
  );
}
