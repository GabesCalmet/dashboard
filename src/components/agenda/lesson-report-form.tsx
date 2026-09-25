"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { submitLessonReport } from "@/server/actions/lessons";
import { lessonStatusLabel, reportableLessonStatuses, toMakeupOutcome, formatDateTime } from "@/lib/labels";
import type { CalendarLessonEvent } from "@/components/agenda/calendar-view";
import { curriculumUnits } from "@/lib/curriculum";
import { CurriculumPicker } from "@/components/lessons/curriculum-picker";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { LessonRescheduleEditor } from "@/components/lessons/lesson-reschedule-editor";
import { MakeupOutcomeSelect } from "@/components/lessons/makeup-outcome-select";
import { toBrazilDateString, toBrazilTimeString } from "@/lib/timezone";
import type { LessonStatus } from "@prisma/client";

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
  const [observations, setObservations] = useState(lesson.observations ?? "");

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onSaved?.();
    }
    if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="space-y-4">
      {lesson.isMakeup && (
        // Deliberately rendered OUTSIDE the <form> below. React resets
        // uncontrolled descendant form fields after a <form action> submits
        // successfully, and Radix's Select renders a hidden native <select>
        // for form/a11y integration — as a descendant of that form, it was
        // getting reset to its mount-time value ("Reposição Marcada") the
        // instant "Salvar relatório da aula" succeeded, and Radix reported
        // that reset back through onValueChange, silently reverting a
        // freshly-picked "Reposição Dada"/"Não Compareceu". Being outside
        // the form entirely avoids this altogether — its own save is
        // already fully independent of the report form's submit.
        <div className="space-y-1.5">
          <Label>Status da aula</Label>
          <div className="flex flex-wrap items-center gap-2">
            <MakeupOutcomeSelect
              makeupLessonId={lesson.id}
              status={toMakeupOutcome(status as LessonStatus)}
              onChange={(next) => setStatus(next)}
              onCanceled={onSaved}
            />
            {lesson.rescheduledFrom && (
              <span className="text-xs text-muted-foreground">
                Substitui aula de {formatDateTime(lesson.rescheduledFrom.scheduledAt)}
              </span>
            )}
          </div>
        </div>
      )}

      <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date">Data</Label>
          <DateInput
            id="date"
            name="date"
            defaultValue={toBrazilDateString(start)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="time">Horário</Label>
          <TimeInput
            id="time"
            name="time"
            defaultValue={toBrazilTimeString(start)}
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
        {!lesson.isMakeup && (
          <div className="space-y-1.5">
            <Label>Status da aula</Label>
            <Select name="status" value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportableLessonStatuses.map((value) => (
                  <SelectItem key={value} value={value}>
                    {lessonStatusLabel[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <input type="hidden" name="contentTaught" value={mode === "unit" ? unit : text} />
        <input type="hidden" name="classFocus" value={focus} />

        {(reschedulableStatuses as readonly string[]).includes(status) && (
          <div className="flex items-center gap-3 rounded-md border p-3 sm:col-span-2">
            <div className="flex-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Reagendamento</p>
              <LessonRescheduleEditor
                lessonId={lesson.id}
                rescheduledTo={lesson.rescheduledTo.map((r) => ({
                  id: r.id,
                  scheduledAt: new Date(r.scheduledAt),
                  durationMin: r.durationMin,
                  status: r.status as LessonStatus,
                }))}
              />
            </div>
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

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="observations">Observações</Label>
          <Textarea
            id="observations"
            name="observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Notas livres sobre como a aula foi..."
            rows={3}
          />
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="animate-spin" />}
            Salvar relatório da aula
          </Button>
        </div>
      </form>
    </div>
  );
}
