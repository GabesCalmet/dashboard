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
import { updateStudentStatus } from "@/server/actions/students";
import { studentStatusLabel } from "@/lib/labels";
import type { StudentStatus } from "@prisma/client";

// Ativo/Pausado/Cancelado, moved out of the cadastro edit form onto its
// own selector next to the student's name — see updateStudentStatus.
export function StudentStatusSelect({
  studentId,
  status,
}: {
  studentId: string;
  status: StudentStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function change(value: StudentStatus) {
    startTransition(async () => {
      try {
        await updateStudentStatus(studentId, value);
        toast.success("Status atualizado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
      }
    });
  }

  return (
    <Select value={status} disabled={isPending} onValueChange={(v) => change(v as StudentStatus)}>
      <SelectTrigger size="sm" className="w-28">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {Object.entries(studentStatusLabel).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
