import { z } from "zod";

export const lessonScheduleSchema = z.object({
  studentId: z.string().min(1, "Selecione o aluno"),
  teacherId: z.string().min(1, "Selecione o professor"),
  date: z.string().min(1, "Informe a data"),
  time: z.string().min(1, "Informe o horário"),
  durationMin: z.coerce.number().int().min(15).max(240).default(50),
});

export const lessonReportSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
  durationMin: z.coerce.number().int().min(15).max(240),
  status: z.enum([
    "SCHEDULED",
    "COMPLETED",
    "CANCELED_BY_STUDENT",
    "NO_SHOW",
    "CANCELED_BY_TEACHER",
    "CANCELED_VACATION",
    "CANCELED_HOLIDAY",
    "MAKEUP",
    "POWER_OUTAGE",
    "TECH_ISSUE",
    "OTHER",
    "PAUSED",
  ]),
  contentTaught: z.string().optional(),
  classFocus: z.string().optional(),
});

export type LessonReportValues = z.infer<typeof lessonReportSchema>;

// Statuses selectable from the quick picker (Aulas de hoje / Relatórios
// tables) — a subset of the full LessonStatus enum. SCHEDULED is included
// so a status set by mistake can be reverted back to "Agendada".
export const quickLessonStatusSchema = z.enum([
  "SCHEDULED",
  "COMPLETED",
  "CANCELED_BY_STUDENT",
  "CANCELED_BY_TEACHER",
  "CANCELED_VACATION",
  "CANCELED_HOLIDAY",
  "MAKEUP",
  "NO_SHOW",
  "PAUSED",
]);

export const lessonSummarySchema = z.object({
  contentTaught: z.string().trim().max(200).optional().or(z.literal("")),
  classFocus: z.string().trim().max(50).optional().or(z.literal("")),
});

// Statuses that unlock the "Reagendamento" picker — CA/CP/CF.
export const reschedulableStatuses = [
  "CANCELED_BY_STUDENT",
  "CANCELED_BY_TEACHER",
  "CANCELED_VACATION",
] as const;

export const lessonRescheduleSchema = z.object({
  date: z.string().min(1, "Informe a data"),
  time: z.string().min(1, "Informe o horário"),
  endTime: z.string().min(1, "Informe o horário de término"),
});
