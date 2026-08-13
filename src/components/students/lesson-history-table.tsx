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
import { formatDateTime } from "@/lib/labels";
import { lessonStatusLabel, lessonStatusBadgeVariant } from "@/lib/labels";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { LessonStatusSelect } from "@/components/lessons/lesson-status-select";
import { LessonRescheduleEditor } from "@/components/lessons/lesson-reschedule-editor";
import { MakeupGivenToggle } from "@/components/lessons/makeup-given-toggle";
import { LessonSummaryEditor } from "@/components/lessons/lesson-summary-editor";
import type { Lesson } from "@prisma/client";

type HistoryLesson = Lesson & {
  rescheduledTo?: { id: string; scheduledAt: Date; status: Lesson["status"]; durationMin: number } | null;
};

function monthValueOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function LessonHistoryTable({
  lessons,
  showTeacher = false,
  teacherNames = {},
  editable = false,
}: {
  lessons: HistoryLesson[];
  showTeacher?: boolean;
  teacherNames?: Record<string, string>;
  // Lets an admin change status/reagendamento/resumo directly from the
  // student's page, not just from the teacher's own Relatórios/Agenda.
  editable?: boolean;
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
              {showTeacher && <TableHead>Professor</TableHead>}
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reagendamento</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead>Homework</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLessons.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{formatDateTime(l.scheduledAt)}</TableCell>
                {showTeacher && <TableCell>{teacherNames[l.teacherId] ?? "—"}</TableCell>}
                <TableCell>{l.durationMin} min</TableCell>
                <TableCell>
                  {editable ? (
                    <LessonStatusSelect lessonId={l.id} status={l.status} />
                  ) : (
                    <Badge variant={lessonStatusBadgeVariant[l.status]}>
                      {lessonStatusLabel[l.status]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {(reschedulableStatuses as readonly string[]).includes(l.status) ? (
                    <div className="flex items-center gap-3">
                      {editable ? (
                        <LessonRescheduleEditor
                          lessonId={l.id}
                          rescheduledTo={l.rescheduledTo ?? null}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {l.rescheduledTo ? formatDateTime(l.rescheduledTo.scheduledAt) : "—"}
                        </span>
                      )}
                      {l.rescheduledTo &&
                        (editable ? (
                          <MakeupGivenToggle
                            makeupLessonId={l.rescheduledTo.id}
                            given={l.rescheduledTo.status === "COMPLETED"}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {l.rescheduledTo.status === "COMPLETED" ? "Dada" : "Pendente"}
                          </span>
                        ))}
                    </div>
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
                <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                  {l.homework ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {filteredLessons.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showTeacher ? 7 : 6}
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
