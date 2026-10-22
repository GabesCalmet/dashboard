"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateStudentClassConfig } from "@/server/actions/students";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  MonthlyValueHistoryEditor,
  type ValueHistoryEntry,
} from "@/components/students/monthly-value-history-editor";
import {
  TeacherAssignmentEditor,
  type TeacherHistoryEntry,
  type TeacherPayMode,
} from "@/components/students/teacher-assignment-editor";
import { LessonScheduleEditor, type ScheduleEntry } from "@/components/students/lesson-schedule-editor";
import { toBrazilDateString } from "@/lib/timezone";
import { formatDate } from "@/lib/labels";

const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isCurrentlyActive(e: { from?: string; until?: string }, today: string): boolean {
  return (!e.from || e.from <= today) && (!e.until || e.until >= today);
}

// Everything about a student's actual classes — teacher/pay, weekly
// schedule, aulas/mês, Meet link — used to live inside "Editar aluno".
// Now it lives here instead: a compact read-only summary of what's
// currently in effect, plus "Adicionar aula" to change any of it. The
// editors themselves (TeacherAssignmentEditor/LessonScheduleEditor/
// MonthlyValueHistoryEditor) are the exact same ones the cadastro used to
// embed — only their home moved, and their data (StudentProfile's
// teacherHistory/lessonSchedule/lessonsPerMonthHistory/meetLink columns)
// is untouched either way.
export function StudentClassConfigCard({
  studentId,
  teachers,
  meetLink,
  teacherId,
  teacherHistory,
  teacherPayRate,
  teacherPayMode,
  teacherMonthlyAmount,
  teacherPercentage,
  lessonsPerMonth,
  lessonsPerMonthHistory,
  lessonSchedule,
  editable,
}: {
  studentId: string;
  teachers: { id: string; label: string }[];
  meetLink: string | null;
  teacherId: string | null;
  teacherHistory: TeacherHistoryEntry[];
  teacherPayRate: number;
  teacherPayMode: TeacherPayMode;
  teacherMonthlyAmount: number;
  teacherPercentage: number;
  lessonsPerMonth: number;
  lessonsPerMonthHistory: ValueHistoryEntry[];
  lessonSchedule: ScheduleEntry[];
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [liveLessonsPerMonth, setLiveLessonsPerMonth] = useState(lessonsPerMonth);
  const [state, formAction, isPending] = useActionState(
    updateStudentClassConfig.bind(null, studentId),
    undefined
  );
  useActionToast(state, () => setOpen(false));

  // Whether there's already something configured — the dialog below opens
  // fully pre-filled either way (it's always the full editable
  // teacher/schedule/aulas-mês history, never a blank "add" form), this
  // only decides what the trigger button is labeled, so it actually reads
  // as an edit affordance once something exists instead of looking like
  // it only ever adds.
  const hasConfig = Boolean(teacherId) || lessonSchedule.length > 0 || lessonsPerMonth > 0;

  const today = toBrazilDateString(new Date());
  const teacherName = teachers.find((t) => t.id === teacherId)?.label ?? null;
  const currentHistoryEntry = teacherHistory.find((e) => e.id === teacherId && !e.until);
  const teacherSince = currentHistoryEntry?.from ? formatDate(currentHistoryEntry.from) : null;
  const activeSchedule = lessonSchedule.filter((e) => isCurrentlyActive(e, today));
  const scheduleLabel =
    activeSchedule.length === 0
      ? "—"
      : activeSchedule
          .map((e) => {
            const day = WEEKDAY_ABBR[e.weekday];
            const time = e.start ? (e.end ? `${e.start}–${e.end}` : e.start) : "";
            return time ? `${day} ${time}` : day;
          })
          .join(", ");

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Aulas contratadas</CardTitle>
        {editable && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant={hasConfig ? "outline" : "default"}>
                {hasConfig ? <Pencil /> : <Plus />}
                {hasConfig ? "Editar" : "Adicionar aula"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{hasConfig ? "Editar aulas contratadas" : "Adicionar aula"}</DialogTitle>
                <DialogDescription>
                  Professor, horário, aulas/mês e link desta turma — separado do resto do cadastro.
                </DialogDescription>
              </DialogHeader>

              <form action={formAction} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MonthlyValueHistoryEditor
                    label="Aulas contratadas por mês"
                    amountLabel="Aulas/mês"
                    amountFieldName="lessonsPerMonth"
                    historyFieldName="lessonsPerMonthHistory"
                    defaultAmount={lessonsPerMonth}
                    defaultHistory={lessonsPerMonthHistory}
                    step="1"
                    min={0}
                    onChange={(amount) => setLiveLessonsPerMonth(amount)}
                  />

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="meetLink">Link do Google Meet (opcional)</Label>
                    <Input
                      id="meetLink"
                      name="meetLink"
                      type="url"
                      placeholder="https://meet.google.com/..."
                      defaultValue={meetLink ?? ""}
                    />
                  </div>
                </div>

                <TeacherAssignmentEditor
                  valueFieldName="teacherId"
                  historyFieldName="teacherHistory"
                  rateFieldName="teacherPayRate"
                  modeFieldName="teacherPayMode"
                  monthlyAmountFieldName="teacherMonthlyAmount"
                  percentageFieldName="teacherPercentage"
                  options={teachers}
                  defaultValue={teacherId}
                  defaultHistory={teacherHistory}
                  defaultRate={teacherPayRate}
                  defaultMode={teacherPayMode}
                  defaultMonthlyAmount={teacherMonthlyAmount}
                  defaultPercentage={teacherPercentage}
                  lessonsPerMonth={liveLessonsPerMonth}
                />

                <div className="space-y-1.5">
                  <Label>Dia(s) e horário(s) da(s) aula(s)</Label>
                  <LessonScheduleEditor name="lessonSchedule" defaultValue={lessonSchedule} />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Professor</p>
          <p className="font-medium">
            {teacherName ? (teacherSince ? `${teacherName} (desde ${teacherSince})` : teacherName) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Aulas/mês</p>
          <p className="font-medium">{lessonsPerMonth || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Horário</p>
          <p className="font-medium">{scheduleLabel}</p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-xs text-muted-foreground">Link do Meet</p>
          <p className="font-medium">{meetLink ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
