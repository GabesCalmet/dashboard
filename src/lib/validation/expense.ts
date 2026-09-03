import { z } from "zod";

export const expenseFormSchema = z
  .object({
    description: z.string().min(2, "Informe uma descrição"),
    amount: z.coerce.number().min(0.01, "Valor inválido"),
    frequency: z.enum(["ONE_TIME", "RECURRING"]),
    category: z.enum(["PROFESSORES", "MARKETING", "PARCEIROS", "OUTROS"]).default("OUTROS"),
    date: z.string().min(1, "Informe a data"),
    dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    endDate: z.string().optional(),
    bankAccount: z.enum(["GABES", "JOE", "ASAAS"]).default("JOE"),
    notes: z.string().optional(),
  })
  .refine((data) => data.frequency !== "RECURRING" || data.dayOfMonth, {
    message: "Informe o dia do mês para gastos recorrentes",
    path: ["dayOfMonth"],
  });

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
