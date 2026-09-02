"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionUsernameAccount, hardDeleteUserAccount } from "@/server/accounts";
import { recordAudit } from "@/server/audit";
import { studentFormSchema } from "@/lib/validation/student";
import { levelOrder } from "@/lib/labels";
import { syncRecurringLessons } from "@/server/lessons/recurring";

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
    const { user } = await provisionUsernameAccount({
      name: data.name,
      username: data.username,
      password: data.password,
      role: "STUDENT",
      email: data.email || undefined,
      phone: data.phone,
    });

    const student = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        cpf: data.cpf || undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        address: data.address,
        meetLink: data.meetLink || undefined,
        teacherId: data.teacherId || undefined,
        teacherHistory: data.teacherHistory,
        courseId: data.courseId || undefined,
        courseHistory: data.courseHistory,
        planId: data.planId || undefined,
        planHistory: data.planHistory,
        monthlyValue: data.monthlyValue,
        monthlyValueHistory: data.monthlyValueHistory,
        bankAccount: data.bankAccount,
        dueDay: data.dueDay,
        dueDayHistory: data.dueDayHistory,
        thirdPartyPayerName: data.thirdPartyAmount ? data.thirdPartyPayerName : undefined,
        thirdPartyAmount: data.thirdPartyAmount,
        thirdPartyDueDay: data.thirdPartyAmount ? data.thirdPartyDueDay : undefined,
        thirdPartyBankAccount: data.thirdPartyAmount ? data.thirdPartyBankAccount : undefined,
        lessonsPerMonth: data.lessonsPerMonth,
        lessonsPerMonthHistory: data.lessonsPerMonthHistory,
        lessonSchedule: data.lessonSchedule,
        level: data.level,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        billingStartDate: data.billingStartDate ? new Date(data.billingStartDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
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
      changes: { name: data.name, username: data.username },
    });

    await syncRecurringLessons(student.id);

    revalidatePath("/admin/students");
    revalidatePath("/coordinator/students");
    revalidatePath("/admin/agenda");
    revalidatePath("/coordinator/agenda");
    return { success: "Aluno cadastrado com sucesso." };
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
  const parsed = studentFormSchema.omit({ username: true, password: true }).safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const before = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: { user: true },
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: before.userId },
      data: { name: data.name, phone: data.phone, email: data.email || null },
    }),
    prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        cpf: data.cpf || undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        address: data.address,
        meetLink: data.meetLink || null,
        teacherId: data.teacherId || null,
        teacherHistory: data.teacherHistory,
        courseId: data.courseId || null,
        courseHistory: data.courseHistory,
        planId: data.planId || null,
        planHistory: data.planHistory,
        monthlyValue: data.monthlyValue,
        monthlyValueHistory: data.monthlyValueHistory,
        bankAccount: data.bankAccount,
        dueDay: data.dueDay,
        dueDayHistory: data.dueDayHistory,
        thirdPartyPayerName: data.thirdPartyAmount ? data.thirdPartyPayerName : null,
        thirdPartyAmount: data.thirdPartyAmount ?? null,
        thirdPartyDueDay: data.thirdPartyAmount ? data.thirdPartyDueDay : null,
        thirdPartyBankAccount: data.thirdPartyAmount ? data.thirdPartyBankAccount : null,
        lessonsPerMonth: data.lessonsPerMonth,
        lessonsPerMonthHistory: data.lessonsPerMonthHistory,
        lessonSchedule: data.lessonSchedule,
        level: data.level,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        billingStartDate: data.billingStartDate ? new Date(data.billingStartDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
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

  await syncRecurringLessons(studentId);

  revalidatePath("/admin/students");
  revalidatePath("/coordinator/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
  return { success: "Aluno atualizado." };
}

// Manually re-runs recurring lesson generation for a student — lets an
// admin/coordinator force the horizon (or a newly-set course end date) to
// take effect immediately, instead of waiting for the next edit or the
// weekly cron regeneration.
export async function resyncStudentLessons(studentId: string) {
  await requireRole("ADMIN", "COORDINATOR");
  await syncRecurringLessons(studentId);

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
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

  await hardDeleteUserAccount(student.userId);
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
