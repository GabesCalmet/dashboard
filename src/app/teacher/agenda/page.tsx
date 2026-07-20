import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { ScheduleLessonDialog } from "@/components/agenda/schedule-lesson-dialog";
import { requireRole } from "@/lib/auth";
import { listStudentsForTeacher } from "@/server/queries/students";

export default async function TeacherAgendaPage() {
  const user = await requireRole("TEACHER");
  const students = await listStudentsForTeacher(user.teacherProfile!.id);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Suas aulas agendadas. Clique em uma aula para preencher o relatório."
        actions={
          <ScheduleLessonDialog
            students={students.map((s) => ({ id: s.id, label: s.user.name }))}
            teachers={[]}
            fixedTeacherId={user.teacherProfile!.id}
          />
        }
      />
      <CalendarView canManageLessons isTeacherView />
    </div>
  );
}
