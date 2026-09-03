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

// Submitted by MonthlyValueHistoryEditor as a JSON string, e.g.
// '[{"amount":141.02,"from":"2026-01-01","until":"2026-06-30"}]'.
const numericHistoryField = z
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
// name/username/password above. Loose validation here (real uniqueness/
// length checks happen per-member in provisionUsernameAccount, same as the
// primary) since a malformed entry should just be dropped, not fail the
// whole cadastro.
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

export const studentFormSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  username: usernameField,
  password: passwordField,
  groupMembers: groupMembersField,
  // Contact email — optional, not used for login, can repeat across profiles.
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  meetLink: z.string().url("Link inválido").optional().or(z.literal("")),
  teacherId: z.string().optional(),
  teacherHistory: selectHistoryField,
  courseId: z.string().optional(),
  courseHistory: selectHistoryField,
  planId: z.string().optional(),
  planHistory: selectHistoryField,
  monthlyValue: z.coerce.number().min(0, "Valor inválido"),
  monthlyValueHistory: numericHistoryField,
  bankAccount: z.enum(["GABES", "JOE", "ASAAS"]).default("JOE"),
  dueDay: z.coerce.number().int().min(1).max(31).default(10),
  dueDayHistory: numericHistoryField,
  // Third party (e.g. a company) covering part or all of monthlyValue,
  // billed separately with its own due date. Only submitted by the form
  // when "tem pagador terceiro" is checked — absent otherwise, so these
  // stay genuinely unset (not "0") when there's no third party.
  thirdPartyPayerName: z.string().optional(),
  thirdPartyAmount: z.coerce.number().min(0.01, "Valor inválido").optional(),
  thirdPartyDueDay: z.coerce.number().int().min(1).max(31).optional(),
  thirdPartyBankAccount: z.enum(["GABES", "JOE", "ASAAS"]).optional(),
  lessonsPerMonth: z.coerce.number().int().min(1).max(60),
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
  // When billing should start counting this student as billable — separate
  // from startDate (when their classes start). Falls back to startDate
  // when left blank.
  billingStartDate: z.string().optional(),
  endDate: z.string().optional(),
  objective: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELED"]).default("ACTIVE"),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
