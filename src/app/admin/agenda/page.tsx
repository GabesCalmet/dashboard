import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { ScheduleLessonDialog } from "@/components/agenda/schedule-lesson-dialog";
import { listStudents, listActiveTeachersForSelect } from "@/server/queries/students";

export default async function AdminAgendaPage() {
  const [students, teachers] = await Promise.all([
    listStudents(),
    listActiveTeachersForSelect(),
  ]);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Todas as aulas da escola, em tempo real."
        actions={
          <ScheduleLessonDialog
            students={students.map((s) => ({ id: s.id, label: s.user.name }))}
            teachers={teachers.map((t) => ({ id: t.id, label: t.user.name }))}
          />
        }
      />
      <CalendarView canManageLessons isTeacherView={false} />
    </div>
  );
}
