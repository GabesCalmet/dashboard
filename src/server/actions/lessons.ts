"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import {
  lessonScheduleSchema,
  lessonReportSchema,
  quickLessonStatusSchema,
  lessonSummarySchema,
  lessonRescheduleSchema,
  reschedulableStatuses,
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

// Quick status update — used by the "Aulas de hoje" picker and the
// Relatórios tables. Only the lesson's own teacher or an admin may set it;
// coordinators and students are view-only, matching the rest of the agenda.
export async function updateLessonStatus(lessonId: string, status: string) {
  const actor = await requireUser();
  const parsed = quickLessonStatusSchema.safeParse(status);
  if (!parsed.success) {
    throw new Error("Status inválido.");
  }

  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const isOwnLesson = actor.role === "TEACHER" && lesson.teacherId === actor.teacherProfile?.id;
  if (actor.role !== "ADMIN" && !isOwnLesson) {
    throw new Error("Você não pode alterar o status desta aula.");
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: parsed.data, reportedAt: new Date() },
  });

  // A reagendamento only makes sense while the lesson is CA/CP/CF — if the
  // status moved away from those (e.g. reverted back to Agendada), drop any
  // makeup lesson that was booked for it.
  if (!(reschedulableStatuses as readonly string[]).includes(parsed.data)) {
    const makeup = await prisma.lesson.findUnique({ where: { rescheduledFromId: lessonId } });
    if (makeup) {
      await prisma.lesson.delete({ where: { id: makeup.id } });
    }
  }

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "STATUS_CHANGE",
    actor,
    changes: { status: parsed.data },
  });

  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
  revalidatePath("/teacher");
  revalidatePath("/teacher/reports");
  revalidatePath("/admin/reports/lessons");
  revalidatePath("/coordinator/reports/lessons");
  revalidatePath(`/admin/students/${lesson.studentId}`);
  revalidatePath(`/coordinator/students/${lesson.studentId}`);
  revalidatePath(`/teacher/students/${lesson.studentId}`);
  revalidatePath("/student/history");
}

// Sets the "Resumo" fields from the Relatórios table — either a free-text
// note or a picked curriculum unit label, plus the class focus tag. Same
// permission rule as updateLessonStatus: the lesson's own teacher or admin.
export async function updateLessonSummary(
  lessonId: string,
  values: { contentTaught?: string; classFocus?: string }
) {
  const actor = await requireUser();
  const parsed = lessonSummarySchema.safeParse(values);
  if (!parsed.success) {
    throw new Error("Dados inválidos.");
  }

  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const isOwnLesson = actor.role === "TEACHER" && lesson.teacherId === actor.teacherProfile?.id;
  if (actor.role !== "ADMIN" && !isOwnLesson) {
    throw new Error("Você não pode editar o resumo desta aula.");
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      contentTaught: parsed.data.contentTaught || null,
      classFocus: parsed.data.classFocus || null,
    },
  });

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "UPDATE",
    actor,
    changes: { contentTaught: parsed.data.contentTaught, classFocus: parsed.data.classFocus },
  });

  revalidatePath("/teacher/reports");
  revalidatePath("/admin/reports/lessons");
  revalidatePath("/coordinator/reports/lessons");
  revalidatePath(`/admin/students/${lesson.studentId}`);
  revalidatePath(`/coordinator/students/${lesson.studentId}`);
  revalidatePath(`/teacher/students/${lesson.studentId}`);
  revalidatePath("/student/history");
}

function revalidateReportPaths(studentId: string) {
  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
  revalidatePath("/teacher/reports");
  revalidatePath("/admin/reports/lessons");
  revalidatePath("/coordinator/reports/lessons");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/student/history");
}

async function requireLessonEditAccess(lessonId: string) {
  const actor = await requireUser();
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const isOwnLesson = actor.role === "TEACHER" && lesson.teacherId === actor.teacherProfile?.id;
  if (actor.role !== "ADMIN" && !isOwnLesson) {
    throw new Error("Você não pode editar esta aula.");
  }
  return { actor, lesson };
}

// Books (or reschedules) the makeup lesson for a canceled one (CA/CP/CF) —
// creates a new Lesson linked via rescheduledFromId the first time, and
// just moves its date/time on subsequent calls.
export async function scheduleLessonReschedule(lessonId: string, values: { date: string; time: string }) {
  const parsed = lessonRescheduleSchema.safeParse(values);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { actor, lesson } = await requireLessonEditAccess(lessonId);
  const scheduledAt = new Date(`${parsed.data.date}T${parsed.data.time}:00`);

  const existing = await prisma.lesson.findUnique({ where: { rescheduledFromId: lessonId } });

  if (existing) {
    await prisma.lesson.update({ where: { id: existing.id }, data: { scheduledAt } });
  } else {
    await prisma.lesson.create({
      data: {
        studentId: lesson.studentId,
        teacherId: lesson.teacherId,
        scheduledAt,
        durationMin: lesson.durationMin,
        status: "MAKEUP",
        rescheduledFromId: lesson.id,
      },
    });
  }

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "UPDATE",
    actor,
    changes: { reagendamento: scheduledAt.toISOString() },
  });

  revalidateReportPaths(lesson.studentId);
}

// Removes the makeup lesson booked for a canceled lesson, if any.
export async function clearLessonReschedule(lessonId: string) {
  const { actor, lesson } = await requireLessonEditAccess(lessonId);

  const existing = await prisma.lesson.findUnique({ where: { rescheduledFromId: lessonId } });
  if (existing) {
    await prisma.lesson.delete({ where: { id: existing.id } });
  }

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "UPDATE",
    actor,
    changes: { reagendamento: null },
  });

  revalidateReportPaths(lesson.studentId);
}

// Marks whether the booked makeup lesson was actually given — toggles the
// makeup lesson's own status between MAKEUP (pending) and COMPLETED (dada).
export async function setMakeupGiven(makeupLessonId: string, given: boolean) {
  const { actor, lesson } = await requireLessonEditAccess(makeupLessonId);

  await prisma.lesson.update({
    where: { id: makeupLessonId },
    data: { status: given ? "COMPLETED" : "MAKEUP" },
  });

  await recordAudit({
    entityType: "Lesson",
    entityId: makeupLessonId,
    action: "STATUS_CHANGE",
    actor,
    changes: { reposicaoDada: given },
  });

  revalidateReportPaths(lesson.studentId);
}
