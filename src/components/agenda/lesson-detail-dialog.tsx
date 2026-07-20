"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LessonReportForm } from "@/components/agenda/lesson-report-form";
import { lessonStatusBadgeVariant } from "@/lib/labels";
import type { CalendarLessonEvent } from "@/components/agenda/calendar-view";
import { formatDateTime } from "@/lib/labels";

export function LessonDetailDialog({
  lesson,
  open,
  onOpenChange,
  canManage,
  isTeacherView,
}: {
  lesson: CalendarLessonEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  isTeacherView: boolean;
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lesson.studentName}
            <Badge variant={lessonStatusBadgeVariant[lesson.status as keyof typeof lessonStatusBadgeVariant]}>
              {lesson.statusLabel}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Prof. {lesson.teacherName} · {formatDateTime(lesson.start)} · {lesson.durationMin} min
          </DialogDescription>
        </DialogHeader>

        {isTeacherView ? (
          <LessonReportForm
            lesson={lesson}
            onSaved={() => {
              onOpenChange(false);
              router.refresh();
            }}
          />
        ) : (
          <div className="space-y-3 text-sm">
            <DetailRow label="Conteúdo ensinado" value={lesson.contentTaught} />
            <DetailRow label="Homework" value={lesson.homework} />
            <DetailRow label="Observações" value={lesson.observations} />
            {!canManage && (
              <p className="text-xs text-muted-foreground">
                Apenas o professor responsável pode editar o relatório desta aula.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p>{value || "—"}</p>
    </div>
  );
}
