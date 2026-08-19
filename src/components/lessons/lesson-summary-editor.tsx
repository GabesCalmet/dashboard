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
import { updateLessonSummary } from "@/server/actions/lessons";
import { curriculumUnits } from "@/lib/curriculum";
import { CurriculumPicker } from "@/components/lessons/curriculum-picker";

export function LessonSummaryEditor({
  lessonId,
  contentTaught,
  classFocus,
}: {
  lessonId: string;
  contentTaught: string | null;
  classFocus: string | null;
}) {
  const initialMode = contentTaught && curriculumUnits.includes(contentTaught) ? "unit" : "text";
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "unit">(initialMode);
  const [text, setText] = useState(initialMode === "text" ? (contentTaught ?? "") : "");
  const [unit, setUnit] = useState(initialMode === "unit" ? (contentTaught ?? "") : "");
  const [focus, setFocus] = useState(classFocus ?? "");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await updateLessonSummary(lessonId, {
          contentTaught: mode === "unit" ? unit : text,
          classFocus: focus,
        });
        toast.success("Resumo da aula salvo.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar resumo.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full max-w-64 items-center gap-1.5 truncate text-left text-sm text-muted-foreground hover:text-foreground">
          <span className="truncate">
            {[contentTaught, classFocus].filter(Boolean).join(" · ") || "—"}
          </span>
          <Pencil className="size-3 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resumo da aula</DialogTitle>
          <DialogDescription>
            Escreva livremente ou selecione a aula do material.
          </DialogDescription>
        </DialogHeader>

        <CurriculumPicker
          mode={mode}
          onModeChange={setMode}
          text={text}
          onTextChange={setText}
          unit={unit}
          onUnitChange={setUnit}
          focus={focus}
          onFocusChange={setFocus}
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
