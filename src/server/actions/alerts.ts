"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";

// Clears a student's attendance alert — only lessons after this timestamp
// will count toward re-triggering it, so the CA/CP/NC lessons that caused
// this alert stay on record but stop flagging the student.
export async function resolveStudentAlert(studentId: string, note: string) {
  const actor = await requireRole("ADMIN", "COORDINATOR");

  await prisma.studentAlertDismissal.create({
    data: { studentId, note: note.trim() || null, dismissedBy: actor.name },
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
