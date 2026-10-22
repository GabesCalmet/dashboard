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
import { updateLessonTeacher } from "@/server/actions/lessons";

// Reassigns which teacher one specific lesson row is attributed to —
// admin-only (see updateLessonTeacher), same idea as reassigning a
// "Parceiro" on a financial transaction: that lesson's hours/pay move to
// whichever teacher is picked here, independent of the student's own
// cadastro/teacherHistory.
export function LessonTeacherSelect({
  lessonId,
  teacherId,
  teachers,
}: {
  lessonId: string;
  teacherId: string;
  teachers: { id: string; label: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={teacherId}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateLessonTeacher(lessonId, value);
            toast.success("Professor da aula atualizado.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar professor.");
          }
        })
      }
    >
      <SelectTrigger size="sm" className="w-[160px]">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {teachers.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
