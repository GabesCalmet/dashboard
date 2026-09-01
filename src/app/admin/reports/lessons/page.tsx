import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { LessonsReportTable } from "@/components/reports/lessons-report-table";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { listAllLessons } from "@/server/queries/lessons";
import { lessonStatusLabel } from "@/lib/labels";
import { parseMonthParam } from "@/lib/month-param";
import type { LessonStatus } from "@prisma/client";

export default async function AdminLessonsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; statuses?: string }>;
}) {
  await requireRole("ADMIN");
  const { month: monthParamValue, statuses: statusesParam } = await searchParams;
  const allLessons = await listAllLessons();

  const hasMonthFilter = Boolean(monthParamValue);
  const { year, month } = parseMonthParam(monthParamValue);
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(new Date(year, month, 1));
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    monthStart
  );

  const statusSet = statusesParam
    ? new Set(statusesParam.split(",").filter((s): s is LessonStatus => s in lessonStatusLabel))
    : null;

  const lessons = allLessons.filter((l) => {
    if (hasMonthFilter && (l.scheduledAt < monthStart || l.scheduledAt > monthEnd)) return false;
    if (statusSet && !statusSet.has(l.status)) return false;
    return true;
  });

  const isFiltered = hasMonthFilter || statusSet;

  return (
    <div>
      <PageHeader
        title="Relatório de aulas"
        description="Todas as aulas da escola — você pode editar o status de qualquer aula aqui."
      />
      {isFiltered && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtrando por:</span>
          {hasMonthFilter && <Badge variant="outline" className="capitalize">{monthLabel}</Badge>}
          {statusSet &&
            [...statusSet].map((s) => (
              <Badge key={s} variant="outline">
                {lessonStatusLabel[s]}
              </Badge>
            ))}
          <Link href="/admin/reports/lessons" className="text-accent hover:underline">
            Limpar filtros
          </Link>
        </div>
      )}
      <LessonsReportTable lessons={lessons} showStudent showTeacher editableAsAdmin />
    </div>
  );
}
