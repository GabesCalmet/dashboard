import { z } from "zod";

const usernameField = z
  .string()
  .trim()
  .min(3, "Nome de usuário deve ter ao menos 3 caracteres")
  .max(30, "Nome de usuário muito longo")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline")
  .transform((v) => v.toLowerCase());

const passwordField = z.string().min(6, "A senha deve ter ao menos 6 caracteres");

export const teacherFormSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  username: usernameField,
  password: passwordField,
  // Contact email — optional, not used for login, can repeat across profiles.
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  specialties: z.string().optional(), // comma-separated
  hourlyRate: z.coerce.number().min(0),
  // Submitted by MonthlyValueHistoryEditor as a JSON string, e.g.
  // '[{"amount":30,"from":"2026-01-01","until":"2026-06-30"}]'.
  hourlyRateHistory: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter((e) => e && typeof e.amount === "number")
          .map((e) => ({
            amount: e.amount,
            from: typeof e.from === "string" && e.from ? e.from : undefined,
            until: typeof e.until === "string" && e.until ? e.until : undefined,
          }));
      } catch {
        return [];
      }
    }),
  admissionDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

// Submitted by LessonScheduleEditor (reused as-is for a teacher's own
// blocked-time editor) as a JSON string, same shape as
// StudentProfile.lessonSchedule, e.g.
// '[{"weekday":1,"start":"09:00","end":"12:00"}]'.
export const blockedSlotsSchema = z.object({
  blockedSlots: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter(
            (e) => e && typeof e.weekday === "number" && e.weekday >= 0 && e.weekday <= 6
          )
          .map((e) => ({
            weekday: e.weekday,
            start: typeof e.start === "string" ? e.start : "",
            end: typeof e.end === "string" ? e.end : "",
            from: typeof e.from === "string" && e.from ? e.from : undefined,
            until: typeof e.until === "string" && e.until ? e.until : undefined,
          }));
      } catch {
        return [];
      }
    }),
});

// How strict a blocked window is — purely informational (see
// blockedSlotDetailSchema below), set per-block from the calendar rather
// than in the weekday-grid editor above.
export const BLOCK_TYPES = [
  "PERMANENTE",
  "TEMPORARIO",
  "PERMANENTE_FLEXIVEL",
  "PERMANENTE_INFLEXIVEL",
  "TEMPORARIO_FLEXIVEL",
  "TEMPORARIO_INFLEXIVEL",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

// Submitted by BlockedSlotDetailDialog for ONE existing blocked window,
// clicked from the teacher's own calendar — weekday isn't editable here
// (fixed by which occurrence was clicked), so it's not part of this form.
export const blockedSlotDetailSchema = z.object({
  start: z.string().min(1, "Informe o horário"),
  end: z.string().optional(),
  from: z.string().optional(),
  until: z.string().optional(),
  tipo: z.enum(BLOCK_TYPES).optional().or(z.literal("")),
  observacoes: z.string().optional(),
});
