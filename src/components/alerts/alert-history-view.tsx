import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, lessonStatusLabel } from "@/lib/labels";
import type { StudentAlertHistory } from "@/server/queries/alerts";

export function AlertHistoryView({
  history,
  studentsBasePath,
  historyBasePath,
  filterStudentId,
}: {
  history: StudentAlertHistory[];
  studentsBasePath: string;
  historyBasePath: string;
  filterStudentId?: string;
}) {
  const filtered = filterStudentId ? history.filter((h) => h.studentId === filterStudentId) : history;

  return (
    <div>
      <PageHeader
        title="Histórico de alertas"
        description="Alertas de frequência já resolvidos, para comparar com os alertas atuais."
      />

      {filterStudentId && (
        <Link
          href={historyBasePath}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Filtrando por {filtered[0]?.studentName ?? "aluno"}
          <X className="size-3" />
        </Link>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum alerta resolvido ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filtered.map((student) => (
            <div key={student.studentId}>
              <Link
                href={`${studentsBasePath}/${student.studentId}`}
                className="text-sm font-medium hover:underline"
              >
                {student.studentName}
              </Link>
              <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {student.entries.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="space-y-2 pt-6">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Resolvido em {formatDateTime(entry.dismissedAt)} por {entry.dismissedBy}
                        </p>
                        {entry.severity && (
                          <Badge variant={entry.severity === "RED" ? "destructive" : "warning"}>
                            {entry.severity === "RED" ? "Crítico" : "Atenção"}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm">{entry.reason ?? "Detalhes não registrados."}</p>

                      {entry.lessons.length > 0 && (
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {entry.lessons.map((l, i) => (
                            <li key={l.id || i}>
                              {l.scheduledAt ? formatDateTime(l.scheduledAt) : "—"} —{" "}
                              {lessonStatusLabel[l.status] ?? l.status}
                            </li>
                          ))}
                        </ul>
                      )}

                      {entry.note && <p className="text-sm italic text-muted-foreground">“{entry.note}”</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
