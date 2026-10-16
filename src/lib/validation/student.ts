import { z } from "zod";

// Login handle chosen by the admin — not an email, shared uniqueness with
// teachers since it's the login column on the same User table.
export const usernameField = z
  .string()
  .trim()
  .min(3, "Nome de usuário deve ter ao menos 3 caracteres")
  .max(30, "Nome de usuário muito longo")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline")
  .transform((v) => v.toLowerCase());

export const passwordField = z.string().min(6, "A senha deve ter ao menos 6 caracteres");

// Submitted by SelectHistoryEditor as a JSON string, e.g.
// '[{"id":"<teacherId>","from":"2026-01-01","until":"2026-06-30"}]'.
const selectHistoryField = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((e) => e && typeof e.id === "string" && e.id)
        .map((e) => ({
          id: e.id,
          from: typeof e.from === "string" && e.from ? e.from : undefined,
          until: typeof e.until === "string" && e.until ? e.until : undefined,
        }));
    } catch {
      return [];
    }
  });

// Submitted by TeacherAssignmentEditor — like selectHistoryField, but each
// entry also carries an hourly rate (mode: HOURLY, the default), a flat
// monthly amount (mode: MONTHLY), or a percentage of monthlyValue (mode:
// PERCENTAGE) that teacher is paid for this student/group during that
// period.
const teacherHistoryField = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((e) => e && typeof e.id === "string" && e.id)
        .map((e) => ({
          id: e.id,
          from: typeof e.from === "string" && e.from ? e.from : undefined,
          until: typeof e.until === "string" && e.until ? e.until : undefined,
          rate: typeof e.rate === "number" ? e.rate : undefined,
          mode:
            e.mode === "MONTHLY" ? ("MONTHLY" as const) : e.mode === "PERCENTAGE" ? ("PERCENTAGE" as const) : undefined,
          monthlyAmount: typeof e.monthlyAmount === "number" ? e.monthlyAmount : undefined,
          percentage: typeof e.percentage === "number" ? e.percentage : undefined,
        }));
    } catch {
      return [];
    }
  });

// Submitted by MonthlyValueHistoryEditor as a JSON string, e.g.
// '[{"amount":141.02,"from":"2026-01-01","until":"2026-06-30"}]'.
export const numericHistoryField = z
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
  });

// Submitted by GroupMembersEditor (create form only) as a JSON string, e.g.
// '[{"name":"...","username":"...","password":"...","email":"...","phone":"..."}]'
// — one additional login for a "grupo" student, beyond the primary
// name/username/password above. Billing for each participant is set up
// afterward from the Financeiro tab (see StudentCharge), not here. Loose
// validation here (real uniqueness/length checks happen per-member in
// provisionUsernameAccount, same as the primary) since a malformed entry
// should just be dropped, not fail the whole cadastro.
const groupMembersField = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (e) =>
            e &&
            typeof e.name === "string" &&
            e.name.trim() &&
            typeof e.username === "string" &&
            e.username.trim() &&
            typeof e.password === "string" &&
            e.password.length >= 6
        )
        .map((e) => ({
          name: e.name.trim(),
          username: e.username.trim().toLowerCase(),
          password: e.password,
          email: typeof e.email === "string" && e.email ? e.email : undefined,
          phone: typeof e.phone === "string" && e.phone ? e.phone : undefined,
        }));
    } catch {
      return [];
    }
  });

// Submitted by GroupMemberFieldsEditor (edit form only) as a JSON string,
// e.g. '[{"userId":"...","name":"...","email":"...","phone":"..."}]' —
// lets every participant's own basic info be edited from the same "Editar
// aluno" dialog instead of needing a separate place per member. Username
// and password aren't included here — those stay under Ver senha/Alterar
// senha on the Membros do grupo card, same as before.
const groupMemberUpdatesField = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((e) => e && typeof e.userId === "string" && e.userId)
        .map((e) => ({
          userId: e.userId,
          name: typeof e.name === "string" ? e.name.trim() : "",
          email: typeof e.email === "string" && e.email ? e.email : undefined,
          phone: typeof e.phone === "string" && e.phone ? e.phone : undefined,
        }))
        .filter((e) => e.name.length >= 2);
    } catch {
      return [];
    }
  });

export const studentFormSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  username: usernameField,
  password: passwordField,
  // Only meaningful for a "grupo" cadastro — a name for the group itself,
  // so it (and each participant) can be found later by it.
  groupName: z.string().optional(),
  groupMembers: groupMembersField,
  groupMemberUpdates: groupMemberUpdatesField,
  // Contact email — optional, not used for login, can repeat across profiles.
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  meetLink: z.string().url("Link inválido").optional().or(z.literal("")),
  teacherId: z.string().optional(),
  teacherHistory: teacherHistoryField,
  // The amount the assigned teacher is paid per hour for this specific
  // student/group — mirrors whichever teacherHistory entry is current.
  // Payroll falls back to the teacher's own hourlyRate when this is unset
  // (0). Only used when teacherPayMode is HOURLY.
  teacherPayRate: z.coerce.number().min(0, "Valor inválido").default(0),
  teacherPayMode: z.enum(["HOURLY", "MONTHLY", "PERCENTAGE"]).default("HOURLY"),
  // Flat amount the assigned teacher is paid per month for this
  // student/group, regardless of classes given — only used when
  // teacherPayMode is MONTHLY.
  teacherMonthlyAmount: z.coerce.number().min(0, "Valor inválido").default(0),
  // Percentage (0-100) of monthlyValue paid to the teacher each month —
  // only used when teacherPayMode is PERCENTAGE.
  teacherPercentage: z.coerce.number().min(0).max(100, "Valor inválido").default(0),
  courseId: z.string().optional(),
  courseHistory: selectHistoryField,
  planId: z.string().optional(),
  planHistory: selectHistoryField,
  // Flat number of classes this student is actually contracted for per
  // month (e.g. 8 for "2x por semana") — admin-entered, independent of how
  // many weekdays a given calendar month happens to have. Mirrors whichever
  // lessonsPerMonthHistory entry is in effect today. Used for "Aulas
  // restantes no mês" on the student's own dashboard and the teacher's
  // "Esperadas" load (both always about the current month, so the flat
  // mirror is enough); the monthly PDF report instead resolves the
  // historically-correct entry for whatever month it's generating, since a
  // student's contracted count can change over time (e.g. 8/mês split
  // across two days a week, later consolidated into 4/mês on one day).
  lessonsPerMonth: z.coerce.number().int().min(0, "Valor inválido").default(0),
  lessonsPerMonthHistory: numericHistoryField,
  // Submitted by LessonScheduleEditor as a JSON string, e.g.
  // '[{"weekday":2,"start":"19:00","end":"19:50"}]'.
  lessonSchedule: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter(
            (e) =>
              e &&
              typeof e.weekday === "number" &&
              e.weekday >= 0 &&
              e.weekday <= 6
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
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  startDate: z.string().optional(),
  // No longer drives actual billing (see StudentCharge, which has its own
  // independent start date) — still used as the floor for the lesson-
  // cycle math on the student's own page ("Total de aulas contratadas"),
  // separate from startDate (when their classes start).
  billingStartDate: z.string().min(1, "Informe a data de início da cobrança"),
  endDate: z.string().optional(),
  objective: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELED"]).default("ACTIVE"),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
