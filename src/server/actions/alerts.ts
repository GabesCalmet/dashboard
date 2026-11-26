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
// board's three non-terminal columns. "PENDENTE" removes the flag row
// entirely; the other two upsert it with that status. resolveStudentAlert
// above also removes it since resolving ends this alert's lifetime
// regardless of which column it was sitting in.
export async function setAlertBoardStatus(
  studentId: string,
  status: "PENDENTE" | "AGUARDANDO_RESPOSTA_PROFESSOR" | "ACAO_NECESSARIA"
) {
  const actor = await requireRole("ADMIN", "COORDINATOR");

  if (status === "PENDENTE") {
    await prisma.studentAlertActionFlag.deleteMany({ where: { studentId } });
  } else {
    await prisma.studentAlertActionFlag.upsert({
      where: { studentId },
      create: { studentId, status, markedBy: actor.name },
      update: { status, markedBy: actor.name, markedAt: new Date() },
    });
  }

  revalidatePath("/admin/alerts");
  revalidatePath("/coordinator/alerts");
}
