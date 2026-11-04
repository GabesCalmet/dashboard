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
import { cn } from "@/lib/utils";
import type { StudentStatus } from "@prisma/client";

// Same colors as the old read-only Badge (studentStatusVariant) — Ativo
// green, Pausado yellow, Cancelado red — kept on the trigger itself so the
// selector still reads as a status indicator, not just a plain dropdown.
const statusTriggerClassName: Record<StudentStatus, string> = {
  ACTIVE: "border-transparent bg-success text-success-foreground",
  PAUSED: "border-transparent bg-warning text-warning-foreground",
  CANCELED: "border-transparent bg-destructive text-destructive-foreground",
};

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
      <SelectTrigger size="sm" className={cn("w-28", statusTriggerClassName[status])}>
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
