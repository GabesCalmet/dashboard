"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionUsernameAccount, hardDeleteUserAccount } from "@/server/accounts";
import { recordAudit } from "@/server/audit";
import { teacherFormSchema } from "@/lib/validation/teacher";
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
        weeklyHours: data.weeklyHours,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
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
        weeklyHours: data.weeklyHours,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
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
