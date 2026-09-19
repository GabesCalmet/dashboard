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
  GABES: "Gabriel",
  JOE: "Joe",
  ASAAS: "Asaas",
};

export const expenseFrequencyLabel: Record<ExpenseFrequency, string> = {
  ONE_TIME: "Único",
  RECURRING: "Recorrente",
};

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  PROFESSORES: "Professores",
  PARCEIROS: "Parceiros",
  MARKETING: "Marketing",
  RD: "R&D",
  OUTROS: "Outros",
};

export const lessonStatusLabel: Record<LessonStatus, string> = {
  SCHEDULED: "Agendada",
  COMPLETED: "Aula dada",
  CANCELED_BY_STUDENT: "Cancelamento aluno",
  NO_SHOW: "Não compareceu",
  CANCELED_BY_TEACHER: "Cancelamento professor",
  CANCELED_LATE: "Cancelamento tarde",
  CANCELED_VACATION: "Cancelamento férias",
  CANCELED_HOLIDAY: "Feriado",
  MAKEUP: "Reposição marcada",
  POWER_OUTAGE: "Faltou energia",
  TECH_ISSUE: "Problema técnico",
  OTHER: "Outro",
  PAUSED: "Pausado",
};

// Short code shown in the quick status picker (Aulas de hoje).
export const lessonStatusCode: Record<LessonStatus, string> = {
  SCHEDULED: "—",
  COMPLETED: "OK",
  CANCELED_BY_STUDENT: "CA",
  NO_SHOW: "NC",
  CANCELED_BY_TEACHER: "CP",
  CANCELED_LATE: "CT",
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
  "CANCELED_LATE",
  "CANCELED_VACATION",
  "CANCELED_HOLIDAY",
  "MAKEUP",
  "NO_SHOW",
  "PAUSED",
];

// Statuses offered by the full "Status da aula" picker (Agenda's lesson
// report form) — SCHEDULED plus the same day-to-day set above. Faltou
// energia / Problema técnico / Outro were dropped as pickable statuses;
// that kind of detail belongs in Observações as free text instead of a
// dedicated status. Still kept in LessonStatus/lessonStatusLabel so any
// lesson already recorded with one of them keeps displaying correctly.
export const reportableLessonStatuses: LessonStatus[] = ["SCHEDULED", ...quickLessonStatuses];

// The 3 states a booked reposição (makeup lesson) can be in — a dedicated
// wording distinct from the generic lessonStatusLabel above, shown in the
// Reagendamento dialog and the "esta é uma aula de reposição" panel. Maps
// 1:1 onto the same LessonStatus values (MAKEUP/COMPLETED/NO_SHOW) a makeup
// lesson's own row already uses, so no schema change is needed to support
// it — only these two are ever set once resolved (see setMakeupOutcome).
export const makeupOutcomeOptions = ["MAKEUP", "COMPLETED", "NO_SHOW"] as const;
export type MakeupOutcome = (typeof makeupOutcomeOptions)[number];

export const makeupOutcomeLabel: Record<MakeupOutcome, string> = {
  MAKEUP: "Reposição marcada",
  COMPLETED: "Reposição dada",
  NO_SHOW: "Reposição não compareceu",
};

// Compact form for table cells where "Reposição" is already implied by the
// column/context.
export function makeupOutcomeShortLabel(status: LessonStatus): string {
  if (status === "COMPLETED") return "Dada";
  if (status === "NO_SHOW") return "Não compareceu";
  return "Marcada";
}

// Calendar event styling per status. Solid statuses (still to happen,
// happened, no-show, reposição) fill the whole block; cancellations and
// feriado are "hollow" — transparent fill, colored outline only — so a
// canceled slot still visibly marks its time on the calendar without
// reading as if the class actually took place.
export const lessonStatusCalendarStyle: Record<
  LessonStatus,
  { background: string; border: string; text: string }
> = {
  SCHEDULED: { background: "#3b6dc7", border: "#3b6dc7", text: "#ffffff" }, // azul — ainda não dada
  COMPLETED: { background: "#1f9d55", border: "#1f9d55", text: "#ffffff" }, // verde — dada
  CANCELED_BY_TEACHER: { background: "transparent", border: "#d64545", text: "#f2a5a5" }, // vazado vermelho — CP
  CANCELED_BY_STUDENT: { background: "transparent", border: "#e0b400", text: "#f2d878" }, // vazado amarelo — CA
  NO_SHOW: { background: "#e8720c", border: "#e8720c", text: "#ffffff" }, // laranja — NC
  // Solid (not vazado) like NC — a late cancellation counts as a class
  // given, so it shouldn't read as an open/unresolved cancellation.
  CANCELED_LATE: { background: "#a855f7", border: "#a855f7", text: "#ffffff" }, // roxo — CT
  CANCELED_VACATION: { background: "transparent", border: "#7dd3fc", text: "#7dd3fc" }, // vazado azul claro — CF
  CANCELED_HOLIDAY: { background: "transparent", border: "#e5e7eb", text: "#e5e7eb" }, // vazado branco — feriado
  MAKEUP: { background: "#4ade80", border: "#4ade80", text: "#06301a" }, // verde claro — reposição
  POWER_OUTAGE: { background: "#d64545", border: "#d64545", text: "#ffffff" },
  TECH_ISSUE: { background: "#d64545", border: "#d64545", text: "#ffffff" },
  OTHER: { background: "#8a8f98", border: "#8a8f98", text: "#ffffff" },
  PAUSED: { background: "#8a8f98", border: "#8a8f98", text: "#ffffff" },
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
  CANCELED_LATE: "destructive",
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

const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function formatWeekday(date: Date | string) {
  return WEEKDAY_ABBR[new Date(date).getDay()];
}
