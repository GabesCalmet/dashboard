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
  lessonObservationsSchema,
  lessonRescheduleSchema,
  makeupOutcomeSchema,
  reschedulableStatuses,
} from "@/lib/validation/lesson";
import type { ActionState } from "@/server/actions/students";
import { brazilDateTime } from "@/lib/timezone";

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
  const scheduledAt = brazilDateTime(data.date, data.time);

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
  const scheduledAt = brazilDateTime(data.date, data.time);

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      scheduledAt,
      durationMin: data.durationMin,
      status: data.status,
      contentTaught: data.contentTaught,
      classFocus: data.classFocus,
      observations: data.observations,
      reportedAt: new Date(),
    },
  });

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
    data: {
      status: parsed.data,
      reportedAt: new Date(),
      // Sticky once set — see the isMakeup field comment on why this can't
      // just be inferred from rescheduledFromId once status moves on to
      // COMPLETED.
      ...(parsed.data === "MAKEUP" ? { isMakeup: true } : {}),
    },
  });

  // A reagendamento only makes sense while the lesson is CA/CP/CF — if the
  // status moved away from those (e.g. reverted back to Agendada), drop any
  // makeup lesson(s) booked for it.
  if (!(reschedulableStatuses as readonly string[]).includes(parsed.data)) {
    await prisma.lesson.deleteMany({ where: { rescheduledFromId: lessonId } });
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

// Permanently removes a single lesson row — for cleaning up a mistaken or
// test entry (e.g. an orphaned reposição left behind after a chain of
// reagendamentos got reset). Deleting the original side of a reagendamento
// just detaches its makeup (rescheduledFromId onDelete: SetNull) rather
// than deleting that too. Admin-only: unlike the edit actions above, this
// erases history instead of correcting it.
export async function deleteLesson(lessonId: string) {
  const actor = await requireRole("ADMIN");
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "DELETE",
    actor,
  });

  await prisma.lesson.delete({ where: { id: lessonId } });

  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
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

// Sets the "Observações" field from the Histórico de aulas table — a
// teacher's free-text notes on how the class went, separate from Resumo
// (what was taught) and Homework. Same permission rule as
// updateLessonSummary: the lesson's own teacher or admin.
export async function updateLessonObservations(lessonId: string, values: { observations?: string }) {
  const actor = await requireUser();
  const parsed = lessonObservationsSchema.safeParse(values);
  if (!parsed.success) {
    throw new Error("Dados inválidos.");
  }

  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const isOwnLesson = actor.role === "TEACHER" && lesson.teacherId === actor.teacherProfile?.id;
  if (actor.role !== "ADMIN" && !isOwnLesson) {
    throw new Error("Você não pode editar as observações desta aula.");
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { observations: parsed.data.observations || null },
  });

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "UPDATE",
    actor,
    changes: { observations: parsed.data.observations },
  });

  revalidatePath("/teacher/reports");
  revalidatePath("/admin/reports/lessons");
  revalidatePath("/coordinator/reports/lessons");
  revalidatePath(`/admin/students/${lesson.studentId}`);
  revalidatePath(`/coordinator/students/${lesson.studentId}`);
  revalidatePath(`/teacher/students/${lesson.studentId}`);
  revalidatePath("/student/history");
}

// Past classes' Resumo/Observações for the same student+teacher, for the
// "Histórico" button in the lesson detail dialog — lets a teacher check
// what they wrote for previous classes without leaving the dialog. Scoped
// to this teacher's own lessons (or any lesson for an admin), same
// permission shape as requireLessonEditAccess.
export async function getLessonHistoryForStudent(
  studentId: string,
  teacherId: string,
  excludeLessonId: string
) {
  const actor = await requireUser();
  if (actor.role === "TEACHER" && actor.teacherProfile?.id !== teacherId) {
    throw new Error("Você não pode ver o histórico desta aula.");
  }

  return prisma.lesson.findMany({
    where: {
      studentId,
      teacherId,
      id: { not: excludeLessonId },
      scheduledAt: { lt: new Date() },
    },
    orderBy: { scheduledAt: "desc" },
    take: 10,
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      contentTaught: true,
      classFocus: true,
      observations: true,
    },
  });
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

function durationFromTimes(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes : null;
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

// Books a new makeup lesson for a canceled one (CA/CP/CF) — always creates
// a new Lesson linked via rescheduledFromId, since a single cancellation
// can be split across multiple reposições (e.g. two 45min sessions
// replacing one 90min class).
export async function addLessonReschedule(
  lessonId: string,
  values: { date: string; time: string; endTime: string }
) {
  const parsed = lessonRescheduleSchema.safeParse(values);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { actor, lesson } = await requireLessonEditAccess(lessonId);
  const scheduledAt = brazilDateTime(parsed.data.date, parsed.data.time);
  const durationMin = durationFromTimes(parsed.data.time, parsed.data.endTime) ?? lesson.durationMin;

  await prisma.lesson.create({
    data: {
      studentId: lesson.studentId,
      teacherId: lesson.teacherId,
      scheduledAt,
      durationMin,
      status: "MAKEUP",
      isMakeup: true,
      rescheduledFromId: lesson.id,
    },
  });

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "UPDATE",
    actor,
    changes: { reagendamento: scheduledAt.toISOString() },
  });

  revalidateReportPaths(lesson.studentId);
}

// Moves a reposição's own date/time in place — unlike addLessonReschedule
// (which books a separate lesson linked via rescheduledFromId to whatever
// it's replacing), a reposição that itself needs to move doesn't need
// another lesson chained off it, just its own scheduledAt/durationMin
// updated. Only offered while the reposição is still "Reposição Marcada" —
// see the Reagendamento column in Histórico de aulas/Relatórios.
export async function rescheduleMakeupLesson(
  lessonId: string,
  values: { date: string; time: string; endTime: string }
) {
  const parsed = lessonRescheduleSchema.safeParse(values);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { actor, lesson } = await requireLessonEditAccess(lessonId);
  const scheduledAt = brazilDateTime(parsed.data.date, parsed.data.time);
  const durationMin = durationFromTimes(parsed.data.time, parsed.data.endTime) ?? lesson.durationMin;

  await prisma.lesson.update({ where: { id: lessonId }, data: { scheduledAt, durationMin } });

  await recordAudit({
    entityType: "Lesson",
    entityId: lessonId,
    action: "UPDATE",
    actor,
    changes: { reagendamento: scheduledAt.toISOString() },
  });

  revalidateReportPaths(lesson.studentId);
}

// Sets a booked makeup lesson's own resolution — Reposição marcada
// (MAKEUP, the initial booked-not-yet-resolved state), Reposição dada
// (COMPLETED) or Reposição não compareceu (NO_SHOW). Both resolved states
// already count toward the Reposições box (see student-detail.tsx) and as
// a class given for teacher payroll (REALIZED_STATUSES in
// queries/teachers.ts already includes MAKEUP/COMPLETED/NO_SHOW, so a
// class the teacher taught is paid the moment it's booked — this only
// tracks the outcome, not pay).
export async function setMakeupOutcome(
  makeupLessonId: string,
  outcome: "MAKEUP" | "COMPLETED" | "NO_SHOW"
) {
  const parsed = makeupOutcomeSchema.safeParse(outcome);
  if (!parsed.success) {
    throw new Error("Status inválido.");
  }
  const { actor, lesson } = await requireLessonEditAccess(makeupLessonId);

  await prisma.lesson.update({
    where: { id: makeupLessonId },
    data: { status: parsed.data },
  });

  await recordAudit({
    entityType: "Lesson",
    entityId: makeupLessonId,
    action: "STATUS_CHANGE",
    actor,
    changes: { reposicaoStatus: parsed.data },
  });

  revalidateReportPaths(lesson.studentId);
}
