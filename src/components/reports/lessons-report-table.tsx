import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, lessonStatusLabel, lessonStatusBadgeVariant } from "@/lib/labels";
import { LessonStatusSelect } from "@/components/lessons/lesson-status-select";
import type { Lesson, LessonStatus } from "@prisma/client";

type ReportLesson = Lesson & {
  student: { user: { name: string } };
  teacher: { user: { name: string } };
};

export function LessonsReportTable({
  lessons,
  showStudent = true,
  showTeacher = true,
  editableTeacherId,
  editableAsAdmin = false,
}: {
  lessons: ReportLesson[];
  showStudent?: boolean;
  showTeacher?: boolean;
  // A lesson row is editable when it's the admin (editableAsAdmin) or when
  // it belongs to this teacherId (their own lesson).
  editableTeacherId?: string;
  editableAsAdmin?: boolean;
}) {
  function canEdit(lesson: ReportLesson) {
    if (editableAsAdmin) return true;
    if (editableTeacherId) return lesson.teacherId === editableTeacherId;
    return false;
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            {showStudent && <TableHead>Aluno</TableHead>}
            {showTeacher && <TableHead>Professor</TableHead>}
            <TableHead>Duração</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Resumo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{formatDateTime(l.scheduledAt)}</TableCell>
              {showStudent && <TableCell>{l.student.user.name}</TableCell>}
              {showTeacher && <TableCell>{l.teacher.user.name}</TableCell>}
              <TableCell>{l.durationMin} min</TableCell>
              <TableCell>
                {canEdit(l) ? (
                  <LessonStatusSelect lessonId={l.id} status={l.status} />
                ) : (
                  <Badge variant={lessonStatusBadgeVariant[l.status as LessonStatus]}>
                    {lessonStatusLabel[l.status as LessonStatus]}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                {l.contentTaught ?? "—"}
              </TableCell>
            </TableRow>
          ))}
          {lessons.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4 + Number(showStudent) + Number(showTeacher)}
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
