import { z } from "zod";

export const studentFormSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  email: z.string().email("Email inválido"),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  teacherId: z.string().optional(),
  courseId: z.string().optional(),
  planId: z.string().optional(),
  monthlyValue: z.coerce.number().min(0, "Valor inválido"),
  lessonsPerMonth: z.coerce.number().int().min(1).max(60),
  // Submitted by WeekdayPicker as a comma-separated string, e.g. "1,3,5".
  lessonWeekdays: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(",")
            .filter(Boolean)
            .map((v) => Number(v))
        : []
    ),
  lessonTime: z.string().optional(),
  lessonEndTime: z.string().optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  startDate: z.string().optional(),
  objective: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELED"]).default("ACTIVE"),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
