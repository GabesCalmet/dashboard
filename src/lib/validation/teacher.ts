import { z } from "zod";

export const teacherFormSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  specialties: z.string().optional(), // comma-separated
  hourlyRate: z.coerce.number().min(0),
  weeklyHours: z.coerce.number().int().min(0).max(320),
  admissionDate: z.string().optional(),
  notes: z.string().optional(),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;
