"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionUsernameAccount, hardDeleteUserAccount } from "@/server/accounts";
import { recordAudit } from "@/server/audit";
import { teacherFormSchema, blockedSlotsSchema, blockedSlotDetailSchema } from "@/lib/validation/teacher";
import type { ActionState } from "@/server/actions/students";

type StoredBlockedSlot = {
  weekday: number;
  start: string;
  end?: string;
  from?: string;
  until?: string;
  tipo?: string;
  observacoes?: string;
};

function asBlockedSlotArray(value: unknown): StoredBlockedSlot[] {
  return Array.isArray(value) ? (value as StoredBlockedSlot[]) : [];
}

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
//
// This is the weekday-grid editor (LessonScheduleEditor, reused as-is from
// the student cadastro), which only ever knows about weekday/start/end/
// from/until — it has no idea "tipo"/"observacoes" exist (those are set
// per-block from the calendar instead, see updateBlockedSlotDetail below).
// Submitting its form would otherwise silently wipe those fields off every
// untouched entry, so unchanged entries (matched by the exact same
// weekday/start/end/from/until) carry their tipo/observacoes forward from
// what's already stored; only a genuinely new or time-edited entry starts
// blank.
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

  const teacher = await prisma.teacherProfile.findUniqueOrThrow({
    where: { id: actor.teacherProfile!.id },
  });
  const existing = asBlockedSlotArray(teacher.blockedSlots);
  const keyOf = (e: { weekday: number; start: string; end?: string; from?: string; until?: string }) =>
    `${e.weekday}|${e.start}|${e.end ?? ""}|${e.from ?? ""}|${e.until ?? ""}`;
  const existingByKey = new Map(existing.map((e) => [keyOf(e), e]));

  const merged = parsed.data.blockedSlots.map((e) => {
    const match = existingByKey.get(keyOf(e));
    return match ? { ...e, tipo: match.tipo, observacoes: match.observacoes } : e;
  });

  await prisma.teacherProfile.update({
    where: { id: actor.teacherProfile!.id },
    data: { blockedSlots: merged },
  });

  revalidatePath("/teacher/agenda");
  revalidatePath(`/admin/teachers/${actor.teacherProfile!.id}`);
  revalidatePath(`/coordinator/teachers/${actor.teacherProfile!.id}`);
  return { success: "Horários bloqueados atualizados." };
}

// A teacher refining ONE existing blocked window's details — clicked from
// their own calendar. Weekday isn't editable here (fixed by which
// occurrence was clicked), so it's not part of the submitted form; the
// stored weekday just carries forward via the spread below. blockIndex
// addresses the entry by its position in the teacher's own blockedSlots
// array, which is safe here (not a stable id) because this reads the
// array fresh from the DB and writes back the same array shape in the
// same request — there's no stale client copy involved.
export async function updateBlockedSlotDetail(
  blockIndex: number,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireRole("TEACHER");
  const raw = Object.fromEntries(formData.entries());
  const parsed = blockedSlotDetailSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const teacher = await prisma.teacherProfile.findUniqueOrThrow({
    where: { id: actor.teacherProfile!.id },
  });
  const slots = asBlockedSlotArray(teacher.blockedSlots);
  if (blockIndex < 0 || blockIndex >= slots.length) {
    return { error: "Esse bloqueio não existe mais — atualize a página." };
  }

  slots[blockIndex] = {
    ...slots[blockIndex],
    start: parsed.data.start,
    end: parsed.data.end || undefined,
    from: parsed.data.from || undefined,
    until: parsed.data.until || undefined,
    tipo: parsed.data.tipo || undefined,
    observacoes: parsed.data.observacoes || undefined,
  };

  await prisma.teacherProfile.update({
    where: { id: actor.teacherProfile!.id },
    data: { blockedSlots: slots },
  });

  revalidatePath("/teacher/agenda");
  revalidatePath(`/admin/teachers/${actor.teacherProfile!.id}`);
  revalidatePath(`/coordinator/teachers/${actor.teacherProfile!.id}`);
  return { success: "Bloqueio atualizado." };
}

export async function deleteBlockedSlot(blockIndex: number): Promise<void> {
  const actor = await requireRole("TEACHER");
  const teacher = await prisma.teacherProfile.findUniqueOrThrow({
    where: { id: actor.teacherProfile!.id },
  });
  const slots = asBlockedSlotArray(teacher.blockedSlots);
  slots.splice(blockIndex, 1);

  await prisma.teacherProfile.update({
    where: { id: actor.teacherProfile!.id },
    data: { blockedSlots: slots },
  });

  revalidatePath("/teacher/agenda");
  revalidatePath(`/admin/teachers/${actor.teacherProfile!.id}`);
  revalidatePath(`/coordinator/teachers/${actor.teacherProfile!.id}`);
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
