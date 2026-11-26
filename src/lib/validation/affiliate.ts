import { z } from "zod";

const usernameField = z
  .string()
  .trim()
  .min(3, "Nome de usuário deve ter ao menos 3 caracteres")
  .max(30, "Nome de usuário muito longo")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline")
  .transform((v) => v.toLowerCase());

const passwordField = z.string().min(6, "A senha deve ter ao menos 6 caracteres");

export const affiliateFormSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  username: usernameField,
  password: passwordField,
  // Contact email — optional, not used for login.
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  // The commission model isn't decided yet — left optional so an
  // affiliate can be cadastrado (and already have students linked) before
  // a percentage is settled. z.coerce.number().optional() would turn a
  // blank field into 0 (Number("") === 0), not "unset" — transformed by
  // hand instead so leaving it blank actually stores null.
  commissionPercent: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : undefined))
    .refine((v) => v === undefined || (v >= 0 && v <= 100), "Comissão deve estar entre 0 e 100"),
  notes: z.string().optional(),
});

export type AffiliateFormValues = z.infer<typeof affiliateFormSchema>;
