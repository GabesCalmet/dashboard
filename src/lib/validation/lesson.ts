import { z } from "zod";

export const lessonScheduleSchema = z.object({
  studentId: z.string().min(1, "Selecione o aluno"),
  teacherId: z.string().min(1, "Selecione o professor"),
  date: z.string().min(1, "Informe a data"),
  time: z.string().min(1, "Informe o horário"),
  durationMin: z.coerce.number().int().min(15).max(240).default(50),
});

// status is optional here — a makeup lesson's own status is exclusively
// owned by setMakeupOutcome (via MakeupOutcomeSelect), which writes it the
// moment it's picked. If this report form also submitted a status value
// for a makeup lesson, the two independent writes could race (whichever
// request's write lands second at the DB wins), silently reverting a
// just-picked "Reposição Dada"/"Não Compareceu" back to stale data. The
// Agenda form only includes this field for a non-makeup lesson.
export const lessonReportSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
  durationMin: z.coerce.number().int().min(15).max(240),
  status: z
    .enum([
      "SCHEDULED",
      "COMPLETED",
      "CANCELED_BY_STUDENT",
      "NO_SHOW",
      "CANCELED_BY_TEACHER",
      "CANCELED_LATE",
      "CANCELED_VACATION",
      "CANCELED_HOLIDAY",
      "MAKEUP",
      "POWER_OUTAGE",
      "TECH_ISSUE",
      "OTHER",
      "PAUSED",
    ])
    .optional(),
  contentTaught: z.string().optional(),
  classFocus: z.string().optional(),
  observations: z.string().optional(),
});

export type LessonReportValues = z.infer<typeof lessonReportSchema>;

// Statuses selectable from the quick picker (Aulas de hoje / Relatórios
// tables) — a subset of the full LessonStatus enum. SCHEDULED is included
// so a status set by mistake can be reverted back to "Agendada". MAKEUP
// isn't accepted here — a reposição's outcome is only ever set through
// setMakeupOutcome/makeupOutcomeSchema below.
export const quickLessonStatusSchema = z.enum([
  "SCHEDULED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELED_LATE",
  "CANCELED_BY_STUDENT",
  "CANCELED_BY_TEACHER",
  "CANCELED_VACATION",
  "CANCELED_HOLIDAY",
]);

export const lessonSummarySchema = z.object({
  contentTaught: z.string().trim().max(200).optional().or(z.literal("")),
  classFocus: z.string().trim().max(50).optional().or(z.literal("")),
});

export const lessonObservationsSchema = z.object({
  observations: z.string().trim().max(1000).optional().or(z.literal("")),
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

// The 3 states a booked reposição can resolve to — see setMakeupOutcome.
export const makeupOutcomeSchema = z.enum(["MAKEUP", "COMPLETED", "NO_SHOW"]);
