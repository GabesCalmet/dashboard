"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";

// Clears a student's attendance alert — only lessons after this timestamp
// will count toward re-triggering it, so the CA/CP/NC lessons that caused
// this alert stay on record but stop flagging the student. The alert's own
// severity/reason/lessons are snapshotted alongside the note so "Histórico
// de alertas" can show what this alert actually was, not just the note.
export async function resolveStudentAlert(
  studentId: string,
  note: string,
  snapshot: {
    severity: "YELLOW" | "RED";
    reason: string;
    lessons: { id: string; scheduledAt: string; status: string }[];
  }
) {
  const actor = await requireRole("ADMIN", "COORDINATOR");

  await prisma.$transaction([
    prisma.studentAlertDismissal.create({
      data: {
        studentId,
        note: note.trim() || null,
        severity: snapshot.severity,
        reason: snapshot.reason,
        lessons: snapshot.lessons,
        dismissedBy: actor.name,
      },
    }),
    // Resolving always clears any "Ação necessária" flag too — it belongs
    // to this alert's lifetime, not the next one.
    prisma.studentAlertActionFlag.deleteMany({ where: { studentId } }),
  ]);

  await recordAudit({
    entityType: "StudentProfile",
    entityId: studentId,
    action: "UPDATE",
    actor,
    changes: { alertResolved: note.trim() || true },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/alerts");
  revalidatePath("/coordinator");
  revalidatePath("/coordinator/alerts");
}

// Pendente <-> Aguardando resposta do professor <-> Ação necessária — the
// board's three non-terminal columns. Always upserts (rather than
// deleting on PENDENTE) so the working note carries forward across every
// column instead of being wiped the moment the status changes —
// resolveStudentAlert above is still what deletes the row, since
// resolving is the only thing that actually ends the alert's lifetime.
export async function setAlertBoardStatus(
  studentId: string,
  status: "PENDENTE" | "AGUARDANDO_RESPOSTA_PROFESSOR" | "ACAO_NECESSARIA",
  note?: string
) {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const trimmedNote = note?.trim() || null;

  await prisma.studentAlertActionFlag.upsert({
    where: { studentId },
    create: { studentId, status, note: trimmedNote, markedBy: actor.name },
    update: { status, note: trimmedNote, markedBy: actor.name, markedAt: new Date() },
  });

  revalidatePath("/admin/alerts");
  revalidatePath("/coordinator/alerts");
}
