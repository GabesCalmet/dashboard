import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";

export default function CoordinatorAgendaPage() {
  return (
    <div>
      <PageHeader title="Agenda" description="Todas as aulas da escola." />
      <CalendarView canManageLessons={false} isTeacherView={false} />
    </div>
  );
}
