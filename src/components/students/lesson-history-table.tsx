import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/labels";
import { lessonStatusLabel, lessonStatusBadgeVariant } from "@/lib/labels";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { LessonStatusSelect } from "@/components/lessons/lesson-status-select";
import { LessonRescheduleEditor } from "@/components/lessons/lesson-reschedule-editor";
import { MakeupGivenToggle } from "@/components/lessons/makeup-given-toggle";
import { LessonSummaryEditor } from "@/components/lessons/lesson-summary-editor";
import type { Lesson } from "@prisma/client";

type HistoryLesson = Lesson & {
  rescheduledTo?: { id: string; scheduledAt: Date; status: Lesson["status"] } | null;
};

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
  return (
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
          {lessons.map((l) => (
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
          {lessons.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={showTeacher ? 7 : 6}
                className="py-10 text-center text-muted-foreground"
              >
                Nenhuma aula registrada ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
