"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { setMakeupGiven } from "@/server/actions/lessons";

export function MakeupGivenToggle({
  makeupLessonId,
  given,
}: {
  makeupLessonId: string;
  given: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      <Checkbox
        checked={given}
        disabled={isPending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            try {
              await setMakeupGiven(makeupLessonId, checked === true);
              toast.success(checked ? "Reposição marcada como dada." : "Reposição marcada como pendente.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erro ao atualizar reposição.");
            }
          })
        }
      />
      {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      <span className="text-xs text-muted-foreground">{given ? "Dada" : "Pendente"}</span>
    </div>
  );
}
