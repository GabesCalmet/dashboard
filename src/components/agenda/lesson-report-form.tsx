"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { curriculumUnits } from "@/lib/curriculum";
import { CurriculumPicker } from "@/components/lessons/curriculum-picker";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { LessonRescheduleEditor } from "@/components/lessons/lesson-reschedule-editor";
import { MakeupGivenToggle } from "@/components/lessons/makeup-given-toggle";
import { MakeupRescheduleButton } from "@/components/lessons/makeup-reschedule-button";

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

  const initialMode =
    lesson.contentTaught && curriculumUnits.includes(lesson.contentTaught) ? "unit" : "text";
  const [mode, setMode] = useState<"text" | "unit">(initialMode);
  const [text, setText] = useState(initialMode === "text" ? (lesson.contentTaught ?? "") : "");
  const [unit, setUnit] = useState(initialMode === "unit" ? (lesson.contentTaught ?? "") : "");
  const [focus, setFocus] = useState(lesson.classFocus ?? "");
  const [status, setStatus] = useState(lesson.status);

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
        <Select name="status" value={status} onValueChange={setStatus}>
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

      <input type="hidden" name="contentTaught" value={mode === "unit" ? unit : text} />
      <input type="hidden" name="classFocus" value={focus} />

      {(reschedulableStatuses as readonly string[]).includes(status) && (
        <div className="flex items-center gap-3 rounded-md border p-3 sm:col-span-2">
          <div className="flex-1">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Reagendamento</p>
            <LessonRescheduleEditor
              lessonId={lesson.id}
              rescheduledTo={
                lesson.rescheduledTo
                  ? {
                      scheduledAt: new Date(lesson.rescheduledTo.scheduledAt),
                      durationMin: lesson.rescheduledTo.durationMin,
                    }
                  : null
              }
            />
          </div>
          {lesson.rescheduledTo && (
            <MakeupGivenToggle
              makeupLessonId={lesson.rescheduledTo.id}
              given={lesson.rescheduledTo.status === "COMPLETED"}
            />
          )}
        </div>
      )}

      {lesson.status === "MAKEUP" && (
        <div className="flex items-center justify-between gap-3 rounded-md border p-3 sm:col-span-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Esta é uma aula de reposição</p>
            <MakeupRescheduleButton
              lessonId={lesson.id}
              scheduledAt={start}
              durationMin={lesson.durationMin}
              onRescheduled={onSaved}
            />
          </div>
          <MakeupGivenToggle
            makeupLessonId={lesson.id}
            given={status === "COMPLETED"}
            onChange={(given) => setStatus(given ? "COMPLETED" : "MAKEUP")}
          />
        </div>
      )}

      <div className="sm:col-span-2">
        <Label className="mb-1.5 block">Conteúdo ensinado</Label>
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
