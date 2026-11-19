import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { ScheduleLessonDialog } from "@/components/agenda/schedule-lesson-dialog";
import { listStudents, listActiveTeachersForSelect } from "@/server/queries/students";

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherIds?: string }>;
}) {
  const { teacherIds: teacherIdsParam } = await searchParams;
  const teacherIds = teacherIdsParam ? teacherIdsParam.split(",").filter(Boolean) : [];
  const [students, teachers] = await Promise.all([
    listStudents(),
    listActiveTeachersForSelect(),
  ]);
  const filteredTeachers = teacherIds
    .map((id) => teachers.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={
          filteredTeachers.length > 0
            ? `Aulas de ${filteredTeachers.map((t) => t.user.name).join(", ")}.`
            : "Todas as aulas da escola, em tempo real."
        }
        actions={
          <ScheduleLessonDialog
            students={students.map((s) => ({ id: s.id, label: s.user.name }))}
            teachers={teachers.map((t) => ({ id: t.id, label: t.user.name }))}
          />
        }
      />
      {filteredTeachers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filteredTeachers.map((t) => {
            const remaining = teacherIds.filter((id) => id !== t.id);
            const href = remaining.length > 0 ? `/admin/agenda?teacherIds=${remaining.join(",")}` : "/admin/agenda";
            return (
              <Link
                key={t.id}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Filtrando por {t.user.name}
                <X className="size-3" />
              </Link>
            );
          })}
        </div>
      )}
      <CalendarView canManageLessons isTeacherView={false} teacherIds={teacherIds} />
    </div>
  );
}
