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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLessonSummary } from "@/server/actions/lessons";
import { curriculumUnits, classFocusOptions } from "@/lib/curriculum";

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

        <Tabs value={mode} onValueChange={(v) => setMode(v as "text" | "unit")}>
          <TabsList>
            <TabsTrigger value="text">Escrever</TabsTrigger>
            <TabsTrigger value="unit">Selecionar aula do material</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="mt-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Descreva o conteúdo da aula..."
              rows={4}
            />
          </TabsContent>
          <TabsContent value="unit" className="mt-3">
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a aula ou teste" />
              </SelectTrigger>
              <SelectContent>
                {curriculumUnits.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>
        </Tabs>

        <div className="space-y-1.5">
          <Label>Foco da aula (opcional)</Label>
          <Select value={focus} onValueChange={setFocus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o foco" />
            </SelectTrigger>
            <SelectContent>
              {classFocusOptions.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
