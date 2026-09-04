import type {
  CourseLevel,
  LessonStatus,
  PaymentStatus,
  StudentStatus,
  BankAccount,
  ExpenseFrequency,
  ExpenseCategory,
} from "@prisma/client";

export const levelLabel: Record<CourseLevel, string> = {
  A1: "A1 — Iniciante",
  A2: "A2 — Básico",
  B1: "B1 — Intermediário",
  B2: "B2 — Intermediário superior",
  C1: "C1 — Avançado",
  C2: "C2 — Proficiente",
};

export const levelOrder: CourseLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const studentStatusLabel: Record<StudentStatus, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  CANCELED: "Cancelado",
};

export const studentStatusVariant: Record<
  StudentStatus,
  "success" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  PAUSED: "warning",
  CANCELED: "destructive",
};

export const bankAccountLabel: Record<BankAccount, string> = {
  GABES: "Gabes",
  JOE: "Joe",
  ASAAS: "Asaas",
};

export const expenseFrequencyLabel: Record<ExpenseFrequency, string> = {
  ONE_TIME: "Único",
  RECURRING: "Recorrente",
};

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  PROFESSORES: "Professores",
  MARKETING: "Marketing",
  PARCEIROS: "Parceiros",
  OUTROS: "Outros",
};

export const lessonStatusLabel: Record<LessonStatus, string> = {
  SCHEDULED: "Agendada",
  COMPLETED: "OK — Aula dada",
  CANCELED_BY_STUDENT: "CA — Cancelamento aluno",
  NO_SHOW: "NC — Não compareceu",
  CANCELED_BY_TEACHER: "CP — Cancelamento professor",
  CANCELED_VACATION: "CF — Cancelamento férias",
  CANCELED_HOLIDAY: "F — Feriado",
  MAKEUP: "R — Reposição",
  POWER_OUTAGE: "Faltou energia",
  TECH_ISSUE: "Problema técnico",
  OTHER: "Outro",
  PAUSED: "P — Pausado",
};

// Short code shown in the quick status picker (Aulas de hoje).
export const lessonStatusCode: Record<LessonStatus, string> = {
  SCHEDULED: "—",
  COMPLETED: "OK",
  CANCELED_BY_STUDENT: "CA",
  NO_SHOW: "NC",
  CANCELED_BY_TEACHER: "CP",
  CANCELED_VACATION: "CF",
  CANCELED_HOLIDAY: "F",
  MAKEUP: "R",
  POWER_OUTAGE: "—",
  TECH_ISSUE: "—",
  OTHER: "—",
  PAUSED: "P",
};

// The set of statuses teachers pick from day-to-day when logging today's
// lessons — a subset of the full LessonStatus enum (which also covers
// technical issues, set elsewhere in the detailed report form). MAKEUP is
// included so a reposição lesson's own row (created via the reagendamento
// flow) can show/keep its real status here too, instead of an unmatched
// blank dropdown — selecting it directly is also how a reposição not
// booked through that flow gets flagged as one.
export const quickLessonStatuses: LessonStatus[] = [
  "COMPLETED",
  "CANCELED_BY_STUDENT",
  "CANCELED_BY_TEACHER",
  "CANCELED_VACATION",
  "CANCELED_HOLIDAY",
  "MAKEUP",
  "NO_SHOW",
  "PAUSED",
];

// Calendar / badge colors per the spec: green=realizada, blue=agendada,
// red=cancelada, yellow=reposição, gray=feriado/férias.
export const lessonStatusColor: Record<LessonStatus, string> = {
  SCHEDULED: "#3b6dc7",
  COMPLETED: "#1f9d55",
  CANCELED_BY_STUDENT: "#d64545",
  NO_SHOW: "#d64545",
  CANCELED_BY_TEACHER: "#d64545",
  CANCELED_VACATION: "#8a8f98",
  CANCELED_HOLIDAY: "#8a8f98",
  MAKEUP: "#e0a91f",
  POWER_OUTAGE: "#d64545",
  TECH_ISSUE: "#d64545",
  OTHER: "#8a8f98",
  PAUSED: "#8a8f98",
};

export const lessonStatusBadgeVariant: Record<
  LessonStatus,
  "success" | "secondary" | "destructive" | "warning" | "outline"
> = {
  SCHEDULED: "secondary",
  COMPLETED: "success",
  CANCELED_BY_STUDENT: "destructive",
  NO_SHOW: "destructive",
  CANCELED_BY_TEACHER: "destructive",
  CANCELED_VACATION: "outline",
  CANCELED_HOLIDAY: "outline",
  MAKEUP: "warning",
  POWER_OUTAGE: "destructive",
  TECH_ISSUE: "destructive",
  OTHER: "outline",
  PAUSED: "outline",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  LATE: "Atrasado",
  PAUSED: "Pausado",
};

export const paymentStatusVariant: Record<
  PaymentStatus,
  "success" | "warning" | "destructive" | "outline"
> = {
  PENDING: "warning",
  PAID: "success",
  LATE: "destructive",
  PAUSED: "outline",
};

export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(date)
  );
}

// For calendar-only values (dueDate, referenceMonth, birthDate, etc.) that
// are always constructed server-side as UTC midnight of the intended day.
// Formatting those with formatDate() in a client component (which runs in
// the viewer's real Brazil browser timezone, UTC-3) rolls them back to the
// previous day/month — pinning to UTC here recovers the intended calendar
// date regardless of where it's rendered.
export function formatCalendarDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(
    new Date(date)
  );
}

export function formatCalendarMonthYear(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(date)
  );
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}
