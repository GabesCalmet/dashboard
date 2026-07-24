import { z } from "zod";

export const courseFormSchema = z.object({
  name: z.string().min(2, "Informe o nome do curso"),
  description: z.string().optional(),
});

export const planFormSchema = z.object({
  name: z.string().min(2, "Informe o nome do plano"),
  price: z.coerce.number().min(0, "Valor inválido"),
  lessonsPerMonth: z.coerce.number().int().min(1).max(60),
  description: z.string().optional(),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;
export type PlanFormValues = z.infer<typeof planFormSchema>;
