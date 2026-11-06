import { z } from "zod";

// An optional override amount — "" (an untouched-but-rendered input) and
// undefined (field absent, e.g. frequency is ONE_TIME so it's not even
// rendered) both mean "no override," never 0.
const optionalAmount = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.coerce.number().min(0.01, "Valor inválido").optional()
);

// Mirrors expenseFormSchema — see src/lib/validation/expense.ts. The one
// addition is payerName, since one student cadastro can have several
// concurrent charges (the student's own, a group member's, a third
// party's), told apart by who they're billed to. decemberAmount/
// januaryAmount are RECURRING-only per-month overrides (e.g. a half-price
// December/January promo) — see getChargeSlotsForMonth.
export const studentChargeFormSchema = z
  .object({
    studentId: z.string().min(1),
    payerName: z.string().optional(),
    description: z.string().optional(),
    amount: z.coerce.number().min(0.01, "Valor inválido"),
    frequency: z.enum(["ONE_TIME", "RECURRING"]),
    date: z.string().min(1, "Informe a data"),
    dueDay: z.coerce.number().int().min(1).max(31).optional(),
    endDate: z.string().optional(),
    decemberAmount: optionalAmount,
    januaryAmount: optionalAmount,
    bankAccount: z.enum(["GABES", "JOE", "ASAAS"]).default("JOE"),
  })
  .refine((data) => data.frequency !== "RECURRING" || data.dueDay, {
    message: "Informe o dia de vencimento para cobranças recorrentes",
    path: ["dueDay"],
  });

export type StudentChargeFormValues = z.infer<typeof studentChargeFormSchema>;
