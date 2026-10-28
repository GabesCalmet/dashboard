"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  provisionUsernameAccount,
  hardDeleteUserAccount,
  setUsernameAccountUsername,
} from "@/server/accounts";
import { recordAudit } from "@/server/audit";
import {
  studentFormSchema,
  studentClassConfigSchema,
  studentClassPeriodSchema,
} from "@/lib/validation/student";
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
        groupName: data.groupMembers.length > 0 ? data.groupName || undefined : undefined,
        cpf: data.cpf || undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        courseId: data.courseId || undefined,
        courseHistory: data.courseHistory,
        planId: data.planId || undefined,
        planHistory: data.planHistory,
        // Billing lives entirely in StudentCharge now (see the Financeiro
        // tab) — monthlyValue has no DB default (NOT NULL), so it still
        // needs an explicit value here; dueDay/bankAccount/thirdParty* all
        // have their own DB defaults (or are nullable) and are simply
        // left unset. Same for meetLink/teacher*/lessonsPerMonth*/
        // lessonSchedule — all left unset (DB defaults: no teacher, 4
        // lessons/month, empty schedule) since class setup now happens
        // separately via "Adicionar aula" on the Histórico de aulas tab,
        // once this student actually exists — see updateStudentClassConfig.
        monthlyValue: 0,
        level: data.level,
        // startDate/billingStartDate/address/endDate are no longer
        // admin-entered at all — startDate just keeps its own DB default
        // (today), and the rest stay null/unset. See the comments on
        // studentFormSchema for where endDate's role actually lives now
        // (a schedule entry's own vigência "until").
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

    // "Grupo" students — additional logins sharing this same profile
    // (lessons, progress, billing). Created one at a time after the main
    // profile so a failure here (e.g. a taken username) still leaves the
    // primary student intact — the admin can add the missing member(s)
    // later from the student's page.
    for (const member of data.groupMembers) {
      const { user: memberUser } = await provisionUsernameAccount({
        name: member.name,
        username: member.username,
        password: member.password,
        role: "STUDENT",
        email: member.email,
        phone: member.phone,
      });
      await prisma.studentGroupMember.create({
        data: { studentProfileId: student.id, userId: memberUser.id },
      });
    }

    revalidatePath("/admin/students");
    revalidatePath("/coordinator/students");
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
  const parsed = studentFormSchema.omit({ password: true }).safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const before = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: { user: true, groupMembers: true },
  });

  // Renaming the login moves the Supabase Auth identity too (see
  // setUsernameAccountUsername) — done up front, before anything else
  // changes, so a taken username fails clean with nothing else touched yet.
  if (data.username !== before.user.username) {
    try {
      await setUsernameAccountUsername(before.userId, data.username);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao alterar nome de usuário." };
    }
  }

  // Only ever touch a member's own login if they actually belong to this
  // student's group — data.groupMemberUpdates carries userIds from the
  // form, not group-member ids, so this is the guard against an edit
  // reaching a user outside this cadastro.
  const memberUserIds = new Set(before.groupMembers.map((m) => m.userId));
  const memberUpdates = data.groupMemberUpdates.filter((m) => memberUserIds.has(m.userId));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: before.userId },
      data: { name: data.name, phone: data.phone, email: data.email || null },
    }),
    ...memberUpdates.map((m) =>
      prisma.user.update({
        where: { id: m.userId },
        data: { name: m.name, email: m.email ?? null, phone: m.phone },
      })
    ),
    prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        groupName: data.groupName || null,
        cpf: data.cpf || undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        courseId: data.courseId || null,
        courseHistory: data.courseHistory,
        planId: data.planId || null,
        planHistory: data.planHistory,
        // Billing (monthlyValue/bankAccount/dueDay/thirdParty*) is no
        // longer part of this form at all — deliberately omitted here so
        // whatever's already in those columns stays untouched, exactly
        // like monthlyValueHistory/dueDayHistory/bankAccountHistory
        // before it. See StudentCharge/the Financeiro tab instead. Same
        // for meetLink/teacher*/lessonsPerMonth*/lessonSchedule — moved
        // out to "Adicionar aula" on the Histórico de aulas tab, so this
        // form no longer touches them either — see
        // updateStudentClassConfig. And for
        // startDate/billingStartDate/address/endDate — no longer
        // admin-editable at all, so left untouched too.
        level: data.level,
        objective: data.objective,
        notes: data.notes,
        status: data.status,
      },
    }),
  ]);

  // Lets an individual student be turned into a "grupo" cadastro right
  // from this same edit — e.g. when they invite a friend to have class
  // together. Provisioned one at a time after the main update so a
  // failure here (e.g. a taken username) still leaves the rest of the
  // edit intact.
  let memberError: string | undefined;
  for (const member of data.groupMembers) {
    try {
      const { user: memberUser } = await provisionUsernameAccount({
        name: member.name,
        username: member.username,
        password: member.password,
        role: "STUDENT",
        email: member.email,
        phone: member.phone,
      });
      await prisma.studentGroupMember.create({
        data: { studentProfileId: studentId, userId: memberUser.id },
      });
    } catch (err) {
      memberError = err instanceof Error ? err.message : "Erro ao adicionar participante.";
    }
  }

  await recordAudit({
    entityType: "StudentProfile",
    entityId: studentId,
    action: "UPDATE",
    actor,
    changes: {
      before: { status: before.status, level: before.level, username: before.user.username },
      after: { status: data.status, level: data.level, username: data.username },
    },
  });

  revalidatePath("/admin/students");
  revalidatePath("/coordinator/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);

  if (memberError) {
    return { error: `Aluno atualizado, mas houve um erro ao adicionar participante: ${memberError}` };
  }
  return { success: "Aluno atualizado." };
}

// Updates everything about a student's actual CLASSES — teacher
// assignment/pay, weekly schedule, lessons/month, Meet link — separate from
// the rest of the cadastro (see updateStudent above), submitted from the
// "Adicionar aula" dialog on the Histórico de aulas tab instead of "Editar
// aluno". Regenerates recurring lessons afterward since a teacher or
// schedule change here is exactly what that depends on.
export async function updateStudentClassConfig(
  studentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const raw = Object.fromEntries(formData.entries());
  const parsed = studentClassConfigSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  await prisma.studentProfile.update({
    where: { id: studentId },
    data: {
      meetLink: data.meetLink || null,
      teacherId: data.teacherId || null,
      teacherHistory: data.teacherHistory,
      teacherPayRate: data.teacherPayRate,
      teacherPayMode: data.teacherPayMode,
      teacherMonthlyAmount: data.teacherMonthlyAmount,
      teacherPercentage: data.teacherPercentage,
      lessonsPerMonth: data.lessonsPerMonth,
      lessonsPerMonthHistory: data.lessonsPerMonthHistory,
      lessonSchedule: data.lessonSchedule,
    },
  });

  await recordAudit({
    entityType: "StudentProfile",
    entityId: studentId,
    action: "UPDATE",
    actor,
    changes: { classConfig: true },
  });

  await syncRecurringLessons(studentId);

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
  revalidatePath("/admin/financial/gastos/professores");
  revalidatePath("/admin/financial/ferias");

  return { success: "Configuração de aulas atualizada." };
}

// One day before a "YYYY-MM-DD" date string, as the same shape of string —
// UTC arithmetic so it never drifts a day either way regardless of server
// timezone, matching how every from/until on these history arrays is
// already just a plain calendar-date string with no time component.
function dayBefore(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Closes out every entry in a history array (teacherHistory, lessonSchedule
// or lessonsPerMonthHistory — any shape, as long as entries may carry
// "until") that's still open-ended, by giving it an explicit "until" —
// everything else about each entry (teacherId, rate, weekday, amount, ...)
// is preserved untouched. An entry that already has its own "until" is
// real, already-bounded history and is left alone.
function closeOpenJsonEntries(value: unknown, closeDate: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((e) => {
    if (typeof e !== "object" || e === null) return e as Record<string, unknown>;
    const entry = e as Record<string, unknown>;
    return entry.until ? entry : { ...entry, until: closeDate };
  });
}

// Starts a clean new "mini-contract" — a new teacher assignment, weekly
// schedule and aulas/mês, all sharing one vigência — instead of hand-
// editing the raw history the way "Editar" does. Whatever was still
// open-ended before (no "until" of its own) gets automatically closed the
// day before this new period starts, across teacherHistory, lessonSchedule
// AND lessonsPerMonthHistory together, so there's never a stale
// still-open entry left dangling once a new one begins — exactly the
// "student paused and came back with a different teacher/schedule, no gap
// left half-registered" case this exists for.
export async function addStudentClassPeriod(
  studentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "COORDINATOR");
  const raw = Object.fromEntries(formData.entries());
  const parsed = studentClassPeriodSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const before = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    select: { teacherHistory: true, lessonSchedule: true, lessonsPerMonthHistory: true },
  });

  const closeDate = dayBefore(data.periodFrom);

  const teacherHistory = closeOpenJsonEntries(before.teacherHistory, closeDate);
  teacherHistory.push({
    id: data.teacherId,
    from: data.periodFrom,
    until: data.periodUntil || undefined,
    ...(data.teacherPayMode === "MONTHLY"
      ? { mode: "MONTHLY", monthlyAmount: data.teacherMonthlyAmount }
      : data.teacherPayMode === "PERCENTAGE"
        ? { mode: "PERCENTAGE", percentage: data.teacherPercentage }
        : { rate: data.teacherPayRate }),
  });

  const lessonSchedule = closeOpenJsonEntries(before.lessonSchedule, closeDate);
  for (const e of data.schedule) {
    lessonSchedule.push({
      weekday: e.weekday,
      start: e.start,
      end: e.end,
      from: data.periodFrom,
      until: data.periodUntil || undefined,
    });
  }

  const lessonsPerMonthHistory = closeOpenJsonEntries(before.lessonsPerMonthHistory, closeDate);
  lessonsPerMonthHistory.push({
    amount: data.lessonsPerMonth,
    from: data.periodFrom,
    until: data.periodUntil || undefined,
  });

  await prisma.studentProfile.update({
    where: { id: studentId },
    data: {
      teacherId: data.teacherId,
      teacherHistory: teacherHistory as Prisma.InputJsonValue[],
      teacherPayRate: data.teacherPayMode === "HOURLY" ? data.teacherPayRate : 0,
      teacherPayMode: data.teacherPayMode,
      teacherMonthlyAmount: data.teacherPayMode === "MONTHLY" ? data.teacherMonthlyAmount : 0,
      teacherPercentage: data.teacherPayMode === "PERCENTAGE" ? data.teacherPercentage : 0,
      lessonsPerMonth: data.lessonsPerMonth,
      lessonsPerMonthHistory: lessonsPerMonthHistory as Prisma.InputJsonValue[],
      lessonSchedule: lessonSchedule as Prisma.InputJsonValue[],
      ...(data.meetLink ? { meetLink: data.meetLink } : {}),
    },
  });

  await recordAudit({
    entityType: "StudentProfile",
    entityId: studentId,
    action: "UPDATE",
    actor,
    changes: { newClassPeriod: { from: data.periodFrom, until: data.periodUntil, teacherId: data.teacherId } },
  });

  await syncRecurringLessons(studentId);

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/coordinator/students/${studentId}`);
  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/admin/agenda");
  revalidatePath("/coordinator/agenda");
  revalidatePath("/teacher/agenda");
  revalidatePath("/admin/financial/gastos/professores");
  revalidatePath("/admin/financial/ferias");

  return { success: "Novo período de aulas criado." };
}

export async function deleteStudent(studentId: string) {
  const actor = await requireRole("ADMIN");
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: { groupMembers: true },
  });

  await recordAudit({
    entityType: "StudentProfile",
    entityId: studentId,
    action: "DELETE",
    actor,
  });

  // Each group member's own login must be deleted explicitly — cascading
  // from the StudentProfile only removes the StudentGroupMember link row,
  // not the User/Supabase Auth account behind it, which would otherwise be
  // left dangling with no profile to resolve to.
  for (const member of student.groupMembers) {
    await hardDeleteUserAccount(member.userId);
  }
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
