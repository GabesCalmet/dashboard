"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBlockedSlotDetail, deleteBlockedSlot } from "@/server/actions/teachers";
import { blockTypeLabel } from "@/lib/labels";
import { BLOCK_TYPES } from "@/lib/validation/teacher";

const WEEKDAY_NAME = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type BlockedSlotDetail = {
  blockIndex: number;
  weekday: number;
  start: string;
  end: string | null;
  from: string | null;
  until: string | null;
  tipo: string | null;
  observacoes: string | null;
};

// Opens when a teacher clicks their own blocked-time shading on the
// Agenda calendar — a dedicated editor for ONE block's details (date
// range, time range, how strict it is, notes), not the lesson report form
// that used to open here by mistake.
export function BlockedSlotDetailDialog({
  block,
  open,
  onOpenChange,
  onSaved,
}: {
  block: BlockedSlotDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const action = updateBlockedSlotDetail.bind(null, block.blockIndex);
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [isDeleting, startDelete] = useTransition();

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onSaved?.();
    }
    if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDelete() {
    startDelete(async () => {
      try {
        await deleteBlockedSlot(block.blockIndex);
        toast.success("Bloqueio removido.");
        onSaved?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao remover bloqueio.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Horário bloqueado — {WEEKDAY_NAME[block.weekday]}</DialogTitle>
          <DialogDescription>
            Esse horário aparece sombreado na sua Agenda, só para referência — ainda não impede
            que uma aula seja marcada nesse horário.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="start">Horário</Label>
            <TimeInput id="start" name="start" defaultValue={block.start} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">Horário fim (opcional)</Label>
            <TimeInput id="end" name="end" defaultValue={block.end ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from">Data início</Label>
            <DateInput id="from" name="from" defaultValue={block.from ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="until">Data fim (opcional)</Label>
            <DateInput id="until" name="until" defaultValue={block.until ?? ""} placeholder="Sem data final" />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Tipo de bloqueio</Label>
            <Select name="tipo" defaultValue={block.tipo ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {blockTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              defaultValue={block.observacoes ?? ""}
              placeholder="Notas livres sobre esse bloqueio..."
              rows={3}
            />
          </div>

          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4" />}
              Remover
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
