import type {
  CourseLevel,
  LessonStatus,
  PaymentStatus,
  StudentStatus,
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

export const lessonStatusLabel: Record<LessonStatus, string> = {
  SCHEDULED: "Agendada",
  COMPLETED: "Realizada",
  CANCELED_BY_STUDENT: "CA — Cancelamento pelo aluno",
  NO_SHOW: "NC — Não compareceu",
  CANCELED_BY_TEACHER: "CP — Cancelamento pelo professor",
  CANCELED_HOLIDAY: "CF — Cancelamento por feriado",
  MAKEUP: "R — Reposição",
  POWER_OUTAGE: "Faltou energia",
  TECH_ISSUE: "Problema técnico",
  OTHER: "Outro",
};

// Calendar / badge colors per the spec: green=realizada, blue=agendada,
// red=cancelada, yellow=reposição, gray=feriado.
export const lessonStatusColor: Record<LessonStatus, string> = {
  SCHEDULED: "#3b6dc7",
  COMPLETED: "#1f9d55",
  CANCELED_BY_STUDENT: "#d64545",
  NO_SHOW: "#d64545",
  CANCELED_BY_TEACHER: "#d64545",
  CANCELED_HOLIDAY: "#8a8f98",
  MAKEUP: "#e0a91f",
  POWER_OUTAGE: "#d64545",
  TECH_ISSUE: "#d64545",
  OTHER: "#8a8f98",
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
  CANCELED_HOLIDAY: "outline",
  MAKEUP: "warning",
  POWER_OUTAGE: "destructive",
  TECH_ISSUE: "destructive",
  OTHER: "outline",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  LATE: "Atrasado",
};

export const paymentStatusVariant: Record<
  PaymentStatus,
  "success" | "warning" | "destructive"
> = {
  PENDING: "warning",
  PAID: "success",
  LATE: "destructive",
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

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}
