import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { AgendaTabsPersistence } from "@/components/agenda/agenda-tabs-persistence";
import { listActiveTeachersForSelect } from "@/server/queries/students";
import { cn } from "@/lib/utils";

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherIds?: string; active?: string; closed?: string }>;
}) {
  const { teacherIds: teacherIdsParam, active, closed } = await searchParams;
  const teacherIds = teacherIdsParam ? teacherIdsParam.split(",").filter(Boolean) : [];
  const teachers = await listActiveTeachersForSelect();
  const filteredTeachers = teacherIds
    .map((id) => teachers.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  // The chip clicked most recently — every search result stays available
  // as its own chip, but only this one's lessons actually show on the
  // calendar. Falls back to the first chip if the URL's own `active`
  // doesn't (or no longer) match any of them.
  const activeTeacher =
    filteredTeachers.find((t) => t.id === active) ?? filteredTeachers[0] ?? undefined;

  return (
    <div>
      <AgendaTabsPersistence
        basePath="/admin/agenda"
        teacherIds={teacherIds}
        active={activeTeacher?.id}
        explicitlyClosed={closed === "1"}
      />
      <PageHeader
        title="Agenda"
        description={activeTeacher ? `Aulas de ${activeTeacher.user.name}.` : "Todas as aulas da escola, em tempo real."}
      />
      {filteredTeachers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filteredTeachers.map((t) => {
            const isActive = t.id === activeTeacher?.id;
            const switchHref = `/admin/agenda?teacherIds=${teacherIds.join(",")}&active=${t.id}`;
            const remaining = teacherIds.filter((id) => id !== t.id);
            const nextActive = isActive ? remaining[0] : activeTeacher?.id;
            const removeHref =
              remaining.length > 0
                ? `/admin/agenda?teacherIds=${remaining.join(",")}&active=${nextActive}`
                : "/admin/agenda?closed=1";
            return (
              <div
                key={t.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                  isActive ? "border-accent bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                )}
              >
                <Link href={switchHref} className="hover:underline">
                  {t.user.name}
                </Link>
                <Link
                  href={removeHref}
                  aria-label={`Remover filtro de ${t.user.name}`}
                  className="hover:text-foreground"
                >
                  <X className="size-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
      <CalendarView canManageLessons isTeacherView={false} teacherIds={activeTeacher ? [activeTeacher.id] : []} />
    </div>
  );
}
