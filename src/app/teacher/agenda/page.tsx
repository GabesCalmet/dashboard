import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { ScheduleLessonDialog } from "@/components/agenda/schedule-lesson-dialog";
import { TeacherBlockedSlotsDialog } from "@/components/agenda/teacher-blocked-slots-dialog";
import { requireRole } from "@/lib/auth";
import { listStudentsForTeacher } from "@/server/queries/students";
import type { ScheduleEntry } from "@/components/students/lesson-schedule-editor";

function parseBlockedSlots(value: unknown): ScheduleEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is { weekday: number; start: string; end: string; from?: string; until?: string } =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).weekday === "number"
    )
    .map((e) => ({
      weekday: e.weekday,
      start: typeof e.start === "string" ? e.start : "",
      end: typeof e.end === "string" ? e.end : "",
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

export default async function TeacherAgendaPage() {
  const user = await requireRole("TEACHER");
  const students = await listStudentsForTeacher(user.teacherProfile!.id);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Suas aulas agendadas. Clique em uma aula para preencher o relatório."
        actions={
          <div className="flex flex-wrap gap-2">
            <TeacherBlockedSlotsDialog
              defaultValue={parseBlockedSlots(user.teacherProfile!.blockedSlots)}
            />
            <ScheduleLessonDialog
              students={students.map((s) => ({ id: s.id, label: s.user.name }))}
              teachers={[]}
              fixedTeacherId={user.teacherProfile!.id}
            />
          </div>
        }
      />
      <CalendarView canManageLessons isTeacherView />
    </div>
  );
}
