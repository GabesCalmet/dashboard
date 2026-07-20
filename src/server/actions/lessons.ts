"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import {
  lessonScheduleSchema,
  lessonReportSchema,
} from "@/lib/validation/lesson";
import type { ActionState } from "@/server/actions/students";

export async function scheduleLesson(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR", "TEACHER");
  const raw = Object.fromEntries(formData.entries());
  const parsed = lessonScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const scheduledAt = new Date(`${data.date}T${data.time}:00`);

  const lesson = await prisma.lesson.create({
    data: {
      studentId: data.studentId,
      teacherId: data.teacherId,
      scheduledAt,
      durationMin: data.durationMin,
    },
  });

  await recordAudit({
    entityType: "Lesson",
    entityId: lesson.id,
    action: "CREATE",
    actor,
  });

  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
  return { success: "Aula agendada." };
}

export async function submitLessonReport(
  lessonId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("TEACHER");
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });

  if (lesson.teacherId !== actor.teacherProfile?.id) {
    return { error: "Você só pode preencher relatórios das suas próprias aulas." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = lessonReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const scheduledAt = new Date(`${data.date}T${data.time}:00`);

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      scheduledAt,
      durationMin: data.durationMin,
      status: data.status,
      contentTaught: data.contentTaught,
      vocabulary: data.vocabulary,
      grammar: data.grammar,
      speaking: data.speaking,
      listening: data.listening,
      homework: data.homework,
      observations: data.observations,
      difficulties: data.difficulties,
      nextTopics: data.nextTopics,
      materialUsed: data.materialUsed,
      recordingUrl: data.recordingUrl,
      reportedAt: new Date(),
    },
  });

  if (data.homework || data.observations) {
    const student = await prisma.studentProfile.findUnique({ where: { id: lesson.studentId } });
    if (student) {
      if (data.homework) {
        await prisma.notification.create({
          data: {
            userId: student.userId,
            type: "HOMEWORK_AVAILABLE",
            title: "Novo homework disponível",
            message: "Seu professor registrou uma nova tarefa de casa após a aula.",
          },
        });
      }
      if (data.observations) {
        await prisma.notification.create({
          data: {
            userId: student.userId,
            type: "TEACHER_OBSERVATION",
            title: "Nova observação do professor",
            message: "Seu professor deixou uma observação sobre sua última aula.",
          },
        });
      }
    }
  }

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "UPDATE",
    actor,
    changes: { status: data.status },
  });

  revalidatePath("/teacher/agenda");
  revalidatePath(`/teacher/students/${lesson.studentId}`);
  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  return { success: "Relatório de aula salvo." };
}

export async function updateLessonStatus(lessonId: string, status: string) {
  const actor = await requireUser();
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: status as never },
  });
  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "STATUS_CHANGE",
    actor,
    changes: { status },
  });
  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
}
