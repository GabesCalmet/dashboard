import { z } from "zod";

export const manualIncomeFormSchema = z.object({
  description: z.string().min(2, "Informe uma descrição"),
  amount: z.coerce.number().min(0.01, "Valor inválido"),
  date: z.string().min(1, "Informe a data"),
  bankAccount: z.enum(["GABES", "JOE", "ASAAS"]).default("JOE"),
  notes: z.string().optional(),
});

export type ManualIncomeFormValues = z.infer<typeof manualIncomeFormSchema>;
