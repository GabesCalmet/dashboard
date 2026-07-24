"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { courseFormSchema, planFormSchema } from "@/lib/validation/catalog";
import type { ActionState } from "@/server/actions/students";

export async function createCourse(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = courseFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const course = await prisma.course.create({ data: parsed.data });
  await recordAudit({ entityType: "Course", entityId: course.id, action: "CREATE", actor });
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/students");
  revalidatePath("/coordinator/students");
  return { success: "Curso criado." };
}

export async function updateCourse(
  courseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = courseFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  await prisma.course.update({ where: { id: courseId }, data: parsed.data });
  await recordAudit({ entityType: "Course", entityId: courseId, action: "UPDATE", actor });
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/students");
  revalidatePath("/coordinator/students");
  return { success: "Curso atualizado." };
}

export async function deleteCourse(courseId: string) {
  const actor = await requireRole("ADMIN");
  const inUse = await prisma.studentProfile.count({ where: { courseId } });
  if (inUse > 0) {
    throw new Error("Este curso está em uso por alunos e não pode ser excluído.");
  }
  await prisma.course.delete({ where: { id: courseId } });
  await recordAudit({ entityType: "Course", entityId: courseId, action: "DELETE", actor });
  revalidatePath("/admin/catalog");
}

export async function createPlan(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = planFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const plan = await prisma.plan.create({ data: parsed.data });
  await recordAudit({ entityType: "Plan", entityId: plan.id, action: "CREATE", actor });
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/students");
  revalidatePath("/coordinator/students");
  return { success: "Plano criado." };
}

export async function updatePlan(
  planId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = planFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  await prisma.plan.update({ where: { id: planId }, data: parsed.data });
  await recordAudit({ entityType: "Plan", entityId: planId, action: "UPDATE", actor });
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/students");
  revalidatePath("/coordinator/students");
  return { success: "Plano atualizado." };
}

export async function togglePlanActive(planId: string, active: boolean) {
  const actor = await requireRole("ADMIN");
  await prisma.plan.update({ where: { id: planId }, data: { active } });
  await recordAudit({
    entityType: "Plan",
    entityId: planId,
    action: "STATUS_CHANGE",
    actor,
    changes: { active },
  });
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/students");
  revalidatePath("/coordinator/students");
}
