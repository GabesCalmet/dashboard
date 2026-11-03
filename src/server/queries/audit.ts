import { prisma } from "@/lib/prisma";

// Every entityType ever passed to recordAudit() (see src/server/audit.ts),
// with a friendly label for the dropdown — kept here as one explicit list
// so a new audited entity is a deliberate addition, not an automatic
// DISTINCT query surfacing whatever string someone happened to type.
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  StudentProfile: "Alunos",
  TeacherProfile: "Professores",
  User: "Usuários",
  Lesson: "Aulas",
  Payment: "Pagamentos",
  Payout: "Pagamentos a professores/parceiros",
  StudentCharge: "Cobranças cadastradas",
  Course: "Cursos",
  Plan: "Planos",
  Expense: "Gastos",
  ExpenseOccurrence: "Ocorrências de gastos",
  ManualIncome: "Receita manual",
};

export const AUDIT_ENTITY_TYPES = Object.keys(AUDIT_ENTITY_LABELS);

// Most recent entries first, capped so one heavily-edited table (e.g.
// Lesson) can't make the page unbounded — there's no date-range filter
// yet, just the newest window into that table's history.
const MAX_ENTRIES = 300;

export async function getAuditEntriesForEntityType(entityType: string) {
  return prisma.auditLog.findMany({
    where: { entityType },
    orderBy: { createdAt: "desc" },
    take: MAX_ENTRIES,
  });
}
