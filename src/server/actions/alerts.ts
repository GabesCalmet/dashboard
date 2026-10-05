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

  await prisma.studentAlertDismissal.create({
    data: {
      studentId,
      note: note.trim() || null,
      severity: snapshot.severity,
      reason: snapshot.reason,
      lessons: snapshot.lessons,
      dismissedBy: actor.name,
    },
  });

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
