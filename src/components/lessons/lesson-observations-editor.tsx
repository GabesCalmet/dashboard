"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateLessonObservations } from "@/server/actions/lessons";

export function LessonObservationsEditor({
  lessonId,
  observations,
}: {
  lessonId: string;
  observations: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(observations ?? "");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await updateLessonObservations(lessonId, { observations: text });
        toast.success("Observações salvas.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar observações.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full max-w-48 items-center gap-1.5 truncate text-left text-sm text-muted-foreground hover:text-foreground">
          <span className="truncate">{observations || "—"}</span>
          <Pencil className="size-3 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Observações da aula</DialogTitle>
          <DialogDescription>Notas livres sobre como a aula foi.</DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva suas observações..."
          rows={4}
        />

        <DialogFooter>
          <Button onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
