"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
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
// Picking Pausado opens a small dialog asking when to follow up again
// (required) before the change actually goes through — the Select's own
// value stays bound to the real server status, so canceling that dialog
// just leaves it showing whatever it already was.
export function StudentStatusSelect({
  studentId,
  status,
}: {
  studentId: string;
  status: StudentStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [contactDate, setContactDate] = useState("");

  function submit(value: StudentStatus, date?: string) {
    startTransition(async () => {
      try {
        await updateStudentStatus(studentId, value, date);
        toast.success("Status atualizado.");
        setPauseDialogOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
      }
    });
  }

  function handleChange(value: StudentStatus) {
    if (value === "PAUSED") {
      setContactDate("");
      setPauseDialogOpen(true);
      return;
    }
    submit(value);
  }

  return (
    <>
      <Select value={status} disabled={isPending} onValueChange={(v) => handleChange(v as StudentStatus)}>
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

      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar aluno</DialogTitle>
            <DialogDescription>Quando devemos entrar em contato novamente?</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="pause-contact-date">Data de contato</Label>
            <DateInput id="pause-contact-date" value={contactDate} onChange={setContactDate} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPauseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!contactDate || isPending}
              onClick={() => submit("PAUSED", contactDate)}
            >
              {isPending && <Loader2 className="animate-spin" />}
              Confirmar pausa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
