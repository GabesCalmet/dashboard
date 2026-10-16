import { z } from "zod";

// Mirrors expenseFormSchema — see src/lib/validation/expense.ts. The one
// addition is payerName, since one student cadastro can have several
// concurrent charges (the student's own, a group member's, a third
// party's), told apart by who they're billed to.
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
    bankAccount: z.enum(["GABES", "JOE", "ASAAS"]).default("JOE"),
  })
  .refine((data) => data.frequency !== "RECURRING" || data.dueDay, {
    message: "Informe o dia de vencimento para cobranças recorrentes",
    path: ["dueDay"],
  });

export type StudentChargeFormValues = z.infer<typeof studentChargeFormSchema>;
