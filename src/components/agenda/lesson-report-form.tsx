"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitLessonReport } from "@/server/actions/lessons";
import { lessonStatusLabel } from "@/lib/labels";
import type { CalendarLessonEvent } from "@/components/agenda/calendar-view";

export function LessonReportForm({
  lesson,
  onSaved,
}: {
  lesson: CalendarLessonEvent;
  onSaved?: () => void;
}) {
  const action = submitLessonReport.bind(null, lesson.id);
  const [state, formAction, isPending] = useActionState(action, undefined);
  const start = new Date(lesson.start);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onSaved?.();
    }
    if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="date">Data</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={start.toISOString().slice(0, 10)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="time">Horário</Label>
        <Input
          id="time"
          name="time"
          type="time"
          defaultValue={start.toTimeString().slice(0, 5)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="durationMin">Duração (min)</Label>
        <Input
          id="durationMin"
          name="durationMin"
          type="number"
          defaultValue={lesson.durationMin}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Status da aula</Label>
        <Select name="status" defaultValue={lesson.status}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(lessonStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="contentTaught">Conteúdo ensinado</Label>
        <Textarea id="contentTaught" name="contentTaught" defaultValue={lesson.contentTaught ?? ""} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="observations">Observações</Label>
        <Textarea id="observations" name="observations" defaultValue={lesson.observations ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="difficulties">Dificuldades encontradas</Label>
        <Textarea id="difficulties" name="difficulties" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nextTopics">Próximos tópicos</Label>
        <Textarea id="nextTopics" name="nextTopics" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="materialUsed">Material utilizado</Label>
        <Input id="materialUsed" name="materialUsed" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="recordingUrl">Link da gravação (opcional)</Label>
        <Input id="recordingUrl" name="recordingUrl" type="url" placeholder="https://..." />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="animate-spin" />}
          Salvar relatório da aula
        </Button>
      </div>
    </form>
  );
}
