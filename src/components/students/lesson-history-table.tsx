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
import type { Lesson } from "@prisma/client";

type HistoryLesson = Lesson & {
  rescheduledTo?: { scheduledAt: Date; status: Lesson["status"] } | null;
};

export function LessonHistoryTable({
  lessons,
  showTeacher = false,
  teacherNames = {},
}: {
  lessons: HistoryLesson[];
  showTeacher?: boolean;
  teacherNames?: Record<string, string>;
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
                <Badge variant={lessonStatusBadgeVariant[l.status]}>
                  {lessonStatusLabel[l.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {(reschedulableStatuses as readonly string[]).includes(l.status) && l.rescheduledTo ? (
                  <span className="flex items-center gap-2">
                    {formatDateTime(l.rescheduledTo.scheduledAt)}
                    <span className="text-xs">
                      ({l.rescheduledTo.status === "COMPLETED" ? "Dada" : "Pendente"})
                    </span>
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                {[l.contentTaught, l.classFocus].filter(Boolean).join(" · ") || "—"}
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
