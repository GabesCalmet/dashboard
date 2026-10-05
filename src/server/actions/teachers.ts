"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionUsernameAccount, hardDeleteUserAccount } from "@/server/accounts";
import { recordAudit } from "@/server/audit";
import { teacherFormSchema, blockedSlotsSchema } from "@/lib/validation/teacher";
import type { ActionState } from "@/server/actions/students";

export async function createTeacher(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const raw = Object.fromEntries(formData.entries());
  const parsed = teacherFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  try {
    const { user } = await provisionUsernameAccount({
      name: data.name,
      username: data.username,
      password: data.password,
      role: "TEACHER",
      email: data.email || undefined,
      phone: data.phone,
    });

    const teacher = await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        specialties: data.specialties
          ? data.specialties.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        hourlyRate: data.hourlyRate,
        hourlyRateHistory: data.hourlyRateHistory,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        notes: data.notes,
      },
    });

    await recordAudit({
      entityType: "TeacherProfile",
      entityId: teacher.id,
      action: "CREATE",
      actor,
      changes: { name: data.name, username: data.username },
    });

    revalidatePath("/admin/teachers");
    return { success: "Professor cadastrado com sucesso." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao cadastrar professor." };
  }
}

export async function updateTeacher(
  teacherId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const raw = Object.fromEntries(formData.entries());
  const parsed = teacherFormSchema.omit({ username: true, password: true }).safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const teacher = await prisma.teacherProfile.findUniqueOrThrow({ where: { id: teacherId } });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: teacher.userId },
      data: { name: data.name, phone: data.phone, email: data.email || null },
    }),
    prisma.teacherProfile.update({
      where: { id: teacherId },
      data: {
        specialties: data.specialties
          ? data.specialties.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        hourlyRate: data.hourlyRate,
        hourlyRateHistory: data.hourlyRateHistory,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : null,
        notes: data.notes,
      },
    }),
  ]);

  await recordAudit({
    entityType: "TeacherProfile",
    entityId: teacherId,
    action: "UPDATE",
    actor,
  });

  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}`);
  return { success: "Professor atualizado." };
}

// A teacher editing their own blocked-time windows — visual-only for now
// (shown on their Agenda and on their admin profile), never enforced
// against scheduling. Scoped to the caller's own profile; there's no
// teacherId param because a teacher can only ever edit their own.
export async function updateTeacherBlockedSlots(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("TEACHER");
  const raw = Object.fromEntries(formData.entries());
  const parsed = blockedSlotsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.teacherProfile.update({
    where: { id: actor.teacherProfile!.id },
    data: { blockedSlots: parsed.data.blockedSlots },
  });

  revalidatePath("/teacher/agenda");
  revalidatePath(`/admin/teachers/${actor.teacherProfile!.id}`);
  revalidatePath(`/coordinator/teachers/${actor.teacherProfile!.id}`);
  return { success: "Horários bloqueados atualizados." };
}

export async function deleteTeacher(teacherId: string) {
  const actor = await requireRole("ADMIN");
  const teacher = await prisma.teacherProfile.findUniqueOrThrow({ where: { id: teacherId } });

  await recordAudit({
    entityType: "TeacherProfile",
    entityId: teacherId,
    action: "DELETE",
    actor,
  });

  await hardDeleteUserAccount(teacher.userId);
  revalidatePath("/admin/teachers");
}
