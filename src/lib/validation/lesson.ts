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
  ]),
  contentTaught: z.string().optional(),
  vocabulary: z.string().optional(),
  grammar: z.string().optional(),
  speaking: z.string().optional(),
  listening: z.string().optional(),
  homework: z.string().optional(),
  observations: z.string().optional(),
  difficulties: z.string().optional(),
  nextTopics: z.string().optional(),
  materialUsed: z.string().optional(),
  recordingUrl: z.string().optional(),
});

export type LessonReportValues = z.infer<typeof lessonReportSchema>;

// Statuses selectable from the quick picker (Aulas de hoje / Relatórios
// tables) — a subset of the full LessonStatus enum.
export const quickLessonStatusSchema = z.enum([
  "COMPLETED",
  "CANCELED_BY_STUDENT",
  "CANCELED_BY_TEACHER",
  "CANCELED_VACATION",
  "CANCELED_HOLIDAY",
  "NO_SHOW",
]);

export const lessonSummarySchema = z.object({
  contentTaught: z.string().trim().max(200).optional().or(z.literal("")),
  classFocus: z.string().trim().max(50).optional().or(z.literal("")),
});
