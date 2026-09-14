"use client";

import { useState, useTransition } from "react";
import { History, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLessonHistoryForStudent } from "@/server/actions/lessons";
import { formatDateTime, lessonStatusLabel } from "@/lib/labels";
import type { LessonStatus } from "@prisma/client";

type HistoryLesson = {
  id: string;
  scheduledAt: Date;
  status: LessonStatus;
  contentTaught: string | null;
  classFocus: string | null;
  observations: string | null;
};

// Lets a teacher check what they wrote for this student's previous classes
// (Resumo, Observações) right from the lesson detail dialog, without
// leaving it — fetched on first expand instead of eagerly on every open.
export function LessonHistoryButton({
  studentId,
  teacherId,
  excludeLessonId,
}: {
  studentId: string;
  teacherId: string;
  excludeLessonId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lessons, setLessons] = useState<HistoryLesson[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      startTransition(async () => {
        try {
          const data = await getLessonHistoryForStudent(studentId, teacherId, excludeLessonId);
          setLessons(data);
          setLoaded(true);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro ao carregar histórico.");
        }
      });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <History className="size-4" /> Histórico — Resumo e Observações
        </span>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && loaded && (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-md border">
          {lessons.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Nenhuma aula anterior registrada.</p>
          ) : (
            lessons.map((l) => (
              <div key={l.id} className="border-b p-3 text-sm last:border-b-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{formatDateTime(l.scheduledAt)}</span>
                  <span className="text-xs text-muted-foreground">{lessonStatusLabel[l.status]}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Resumo: </span>
                  {[l.contentTaught, l.classFocus].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Observações: </span>
                  {l.observations || "—"}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
