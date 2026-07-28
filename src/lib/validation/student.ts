import { z } from "zod";

// Login handle chosen by the admin — not an email, shared uniqueness with
// teachers since it's the login column on the same User table.
const usernameField = z
  .string()
  .trim()
  .min(3, "Nome de usuário deve ter ao menos 3 caracteres")
  .max(30, "Nome de usuário muito longo")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline")
  .transform((v) => v.toLowerCase());

const passwordField = z.string().min(6, "A senha deve ter ao menos 6 caracteres");

export const studentFormSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  username: usernameField,
  password: passwordField,
  // Contact email — optional, not used for login, can repeat across profiles.
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  teacherId: z.string().optional(),
  courseId: z.string().optional(),
  planId: z.string().optional(),
  monthlyValue: z.coerce.number().min(0, "Valor inválido"),
  dueDay: z.coerce.number().int().min(1).max(31).default(10),
  lessonsPerMonth: z.coerce.number().int().min(1).max(60),
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
          }));
      } catch {
        return [];
      }
    }),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  startDate: z.string().optional(),
  objective: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELED"]).default("ACTIVE"),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
