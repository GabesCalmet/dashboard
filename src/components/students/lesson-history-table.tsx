"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDateTime,
  formatWeekday,
  lessonStatusLabel,
  lessonStatusBadgeVariant,
  makeupOutcomeShortLabel,
  makeupOutcomeLabel,
  toMakeupOutcome,
} from "@/lib/labels";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { LessonStatusSelect } from "@/components/lessons/lesson-status-select";
import { LessonRescheduleEditor } from "@/components/lessons/lesson-reschedule-editor";
import { MakeupOutcomeSelect } from "@/components/lessons/makeup-outcome-select";
import { MakeupRescheduleButton } from "@/components/lessons/makeup-reschedule-button";
import { LessonSummaryEditor } from "@/components/lessons/lesson-summary-editor";
import { LessonObservationsEditor } from "@/components/lessons/lesson-observations-editor";
import { DeleteLessonButton } from "@/components/lessons/delete-lesson-button";
import type { Lesson } from "@prisma/client";

type HistoryLesson = Lesson & {
  rescheduledTo?: { id: string; scheduledAt: Date; status: Lesson["status"]; durationMin: number }[];
};

function monthValueOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function LessonHistoryTable({
  lessons,
  showTeacher = false,
  teacherNames = {},
  editable = false,
  canDelete = false,
}: {
  lessons: HistoryLesson[];
  showTeacher?: boolean;
  teacherNames?: Record<string, string>;
  // Lets an admin change status/reagendamento/resumo directly from the
  // student's page, not just from the teacher's own Relatórios/Agenda.
  editable?: boolean;
  // Admin-only: lets a mistaken or test lesson row (e.g. an orphaned
  // reposição left behind by a reset reagendamento) be removed outright.
  canDelete?: boolean;
}) {
  const [monthValue, setMonthValue] = useState(() => monthValueOf(new Date()));
  const [year, month] = monthValue.split("-").map(Number);

  function shiftMonth(delta: number) {
    setMonthValue(monthValueOf(new Date(year, month - 1 + delta, 1)));
  }

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
  const filteredLessons = lessons.filter((l) => {
    const d = new Date(l.scheduledAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-36 text-center text-sm font-medium capitalize">{monthLabel}</span>
        <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
          <ChevronRight className="size-4" />
        </Button>
        <Input
          type="month"
          value={monthValue}
          onChange={(e) => e.target.value && setMonthValue(e.target.value)}
          className="w-40"
          aria-label="Ir para o mês"
        />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Dia</TableHead>
              {showTeacher && <TableHead>Professor</TableHead>}
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reagendamento</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead>Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLessons.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{formatDateTime(l.scheduledAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatWeekday(l.scheduledAt)}
                </TableCell>
                {showTeacher && <TableCell>{teacherNames[l.teacherId] ?? "—"}</TableCell>}
                <TableCell>{l.durationMin} min</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {l.isMakeup ? (
                      editable ? (
                        <MakeupOutcomeSelect makeupLessonId={l.id} status={toMakeupOutcome(l.status)} />
                      ) : (
                        <Badge variant={lessonStatusBadgeVariant[l.status]}>
                          {makeupOutcomeLabel[toMakeupOutcome(l.status)]}
                        </Badge>
                      )
                    ) : editable ? (
                      <LessonStatusSelect lessonId={l.id} status={l.status} />
                    ) : (
                      <Badge variant={lessonStatusBadgeVariant[l.status]}>
                        {lessonStatusLabel[l.status]}
                      </Badge>
                    )}
                    {canDelete && <DeleteLessonButton lessonId={l.id} />}
                  </div>
                </TableCell>
                <TableCell>
                  {l.isMakeup ? (
                    l.status === "MAKEUP" ? (
                      editable ? (
                        <MakeupRescheduleButton
                          lessonId={l.id}
                          scheduledAt={l.scheduledAt}
                          durationMin={l.durationMin}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )
                  ) : (reschedulableStatuses as readonly string[]).includes(l.status) ? (
                    editable ? (
                      <LessonRescheduleEditor lessonId={l.id} rescheduledTo={l.rescheduledTo ?? []} />
                    ) : (l.rescheduledTo ?? []).length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {(l.rescheduledTo ?? []).map((r) => (
                          <div key={r.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDateTime(r.scheduledAt)}</span>
                            <span className="text-xs">{makeupOutcomeShortLabel(r.status)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-64">
                  {editable ? (
                    <LessonSummaryEditor
                      lessonId={l.id}
                      contentTaught={l.contentTaught}
                      classFocus={l.classFocus}
                    />
                  ) : (
                    <p className="truncate text-sm text-muted-foreground">
                      {[l.contentTaught, l.classFocus].filter(Boolean).join(" · ") || "—"}
                    </p>
                  )}
                </TableCell>
                <TableCell className="max-w-48">
                  {editable ? (
                    <LessonObservationsEditor lessonId={l.id} observations={l.observations} />
                  ) : (
                    <p className="truncate text-sm text-muted-foreground">{l.observations ?? "—"}</p>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredLessons.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showTeacher ? 8 : 7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma aula registrada neste mês.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
