"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionUserAccount, deactivateUserAccount } from "@/server/accounts";
import { recordAudit } from "@/server/audit";
import { studentFormSchema } from "@/lib/validation/student";
import { levelOrder } from "@/lib/labels";

export type ActionState = { error?: string; success?: string; tempPassword?: string } | undefined;

export async function createStudent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const raw = Object.fromEntries(formData.entries());
  const parsed = studentFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  try {
    const { user, tempPassword } = await provisionUserAccount({
      name: data.name,
      email: data.email,
      role: "STUDENT",
      phone: data.phone,
    });

    const student = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        cpf: data.cpf || undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        address: data.address,
        teacherId: data.teacherId || undefined,
        courseId: data.courseId || undefined,
        planId: data.planId || undefined,
        monthlyValue: data.monthlyValue,
        dueDay: data.dueDay,
        lessonsPerMonth: data.lessonsPerMonth,
        lessonWeekdays: data.lessonWeekdays,
        lessonTime: data.lessonTime,
        lessonEndTime: data.lessonEndTime,
        level: data.level,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        objective: data.objective,
        notes: data.notes,
        status: data.status,
      },
    });

    await recordAudit({
      entityType: "StudentProfile",
      entityId: student.id,
      action: "CREATE",
      actor,
      changes: { name: data.name, email: data.email },
    });

    revalidatePath("/admin/students");
    revalidatePath("/coordinator/students");
    return { success: "Aluno cadastrado com sucesso.", tempPassword };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao cadastrar aluno." };
  }
}

export async function updateStudent(
  studentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const raw = Object.fromEntries(formData.entries());
  const parsed = studentFormSchema.omit({ email: true }).safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const before = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: { user: true },
  });

  await prisma.$transaction([
    prisma.user.update({ where: { id: before.userId }, data: { name: data.name, phone: data.phone } }),
    prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        cpf: data.cpf || undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        address: data.address,
        teacherId: data.teacherId || null,
        courseId: data.courseId || null,
        planId: data.planId || null,
        monthlyValue: data.monthlyValue,
        dueDay: data.dueDay,
        lessonsPerMonth: data.lessonsPerMonth,
        lessonWeekdays: data.lessonWeekdays,
        lessonTime: data.lessonTime,
        lessonEndTime: data.lessonEndTime,
        level: data.level,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        objective: data.objective,
        notes: data.notes,
        status: data.status,
      },
    }),
  ]);

  await recordAudit({
    entityType: "StudentProfile",
    entityId: studentId,
    action: "UPDATE",
    actor,
    changes: { before: { status: before.status, level: before.level }, after: { status: data.status, level: data.level } },
  });

  revalidatePath("/admin/students");
  revalidatePath("/coordinator/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
  return { success: "Aluno atualizado." };
}

export async function deleteStudent(studentId: string) {
  const actor = await requireRole("ADMIN");
  const student = await prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId } });

  await recordAudit({
    entityType: "StudentProfile",
    entityId: studentId,
    action: "DELETE",
    actor,
  });

  await deactivateUserAccount(student.userId);
  revalidatePath("/admin/students");
}

export async function promoteStudentLevel(studentId: string) {
  const actor = await requireRole("ADMIN");
  const student = await prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId } });

  const currentIndex = levelOrder.indexOf(student.level);
  const nextLevel = levelOrder[currentIndex + 1];
  if (!nextLevel) throw new Error("Aluno já está no nível máximo (C2).");

  await prisma.$transaction([
    prisma.studentProfile.update({
      where: { id: studentId },
      data: { level: nextLevel, levelProgress: 0 },
    }),
    prisma.levelHistory.create({
      data: {
        studentId,
        fromLevel: student.level,
        toLevel: nextLevel,
        promotedBy: actor.id,
      },
    }),
  ]);

  await recordAudit({
    entityType: "StudentProfile",
    entityId: studentId,
    action: "PROMOTE",
    actor,
    changes: { from: student.level, to: nextLevel },
  });

  revalidatePath(`/admin/students/${studentId}`);
}

export async function updateLevelProgress(studentId: string, progress: number) {
  await requireRole("ADMIN", "COORDINATOR");
  await prisma.studentProfile.update({
    where: { id: studentId },
    data: { levelProgress: Math.max(0, Math.min(100, progress)) },
  });
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
}

export async function ensureViewerCanSeeStudent(studentId: string) {
  const user = await requireUser();
  if (user.role === "ADMIN" || user.role === "COORDINATOR") return;
  if (user.role === "TEACHER" && user.teacherProfile) {
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (student?.teacherId === user.teacherProfile.id) return;
  }
  if (user.role === "STUDENT" && user.studentProfile?.id === studentId) return;
  throw new Error("Acesso negado.");
}
