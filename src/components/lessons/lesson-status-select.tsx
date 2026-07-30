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
import { updateLessonStatus } from "@/server/actions/lessons";
import { lessonStatusLabel, quickLessonStatuses } from "@/lib/labels";
import type { LessonStatus } from "@prisma/client";

export function LessonStatusSelect({
  lessonId,
  status,
}: {
  lessonId: string;
  status: LessonStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateLessonStatus(lessonId, value);
            toast.success("Status da aula atualizado.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
          }
        })
      }
    >
      <SelectTrigger size="sm" className="w-[190px]">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="SCHEDULED" disabled>
          {lessonStatusLabel.SCHEDULED}
        </SelectItem>
        {quickLessonStatuses.map((s) => (
          <SelectItem key={s} value={s}>
            {lessonStatusLabel[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
