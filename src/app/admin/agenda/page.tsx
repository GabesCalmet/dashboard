import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { ScheduleLessonDialog } from "@/components/agenda/schedule-lesson-dialog";
import { listStudents, listActiveTeachersForSelect } from "@/server/queries/students";

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  const { teacherId } = await searchParams;
  const [students, teachers] = await Promise.all([
    listStudents(),
    listActiveTeachersForSelect(),
  ]);
  const filteredTeacher = teacherId ? teachers.find((t) => t.id === teacherId) : undefined;

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={
          filteredTeacher
            ? `Aulas de ${filteredTeacher.user.name}.`
            : "Todas as aulas da escola, em tempo real."
        }
        actions={
          <ScheduleLessonDialog
            students={students.map((s) => ({ id: s.id, label: s.user.name }))}
            teachers={teachers.map((t) => ({ id: t.id, label: t.user.name }))}
          />
        }
      />
      {filteredTeacher && (
        <Link
          href="/admin/agenda"
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Filtrando por {filteredTeacher.user.name}
          <X className="size-3" />
        </Link>
      )}
      <CalendarView canManageLessons isTeacherView={false} teacherId={teacherId} />
    </div>
  );
}
