import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { listActiveTeachersForSelect } from "@/server/queries/students";

export default async function CoordinatorAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  const { teacherId } = await searchParams;
  const filteredTeacher = teacherId
    ? (await listActiveTeachersForSelect()).find((t) => t.id === teacherId)
    : undefined;

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={filteredTeacher ? `Aulas de ${filteredTeacher.user.name}.` : "Todas as aulas da escola."}
      />
      {filteredTeacher && (
        <Link
          href="/coordinator/agenda"
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Filtrando por {filteredTeacher.user.name}
          <X className="size-3" />
        </Link>
      )}
      <CalendarView canManageLessons={false} isTeacherView={false} teacherId={teacherId} />
    </div>
  );
}
