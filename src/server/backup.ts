import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

// Every table in the system, in FK-safe order (a table only appears after
// everything it references) so a future restore tool can just replay this
// list top to bottom. User.passwordEncrypted is deliberately left out of
// every format — per-request, this backup isn't meant to carry login
// credentials at all, encrypted or not.
const BACKUP_TABLES: { name: string; fetch: () => Promise<Record<string, unknown>[]> }[] = [
  {
    name: "User",
    fetch: () =>
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          avatarUrl: true,
          phone: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
  },
  { name: "Course", fetch: () => prisma.course.findMany() },
  { name: "Plan", fetch: () => prisma.plan.findMany() },
  { name: "TeacherProfile", fetch: () => prisma.teacherProfile.findMany() },
  { name: "StudentProfile", fetch: () => prisma.studentProfile.findMany() },
  { name: "StudentGroupMember", fetch: () => prisma.studentGroupMember.findMany() },
  { name: "StudentAlertDismissal", fetch: () => prisma.studentAlertDismissal.findMany() },
  { name: "LevelHistory", fetch: () => prisma.levelHistory.findMany() },
  { name: "Lesson", fetch: () => prisma.lesson.findMany() },
  { name: "Payment", fetch: () => prisma.payment.findMany() },
  { name: "StudentCharge", fetch: () => prisma.studentCharge.findMany() },
  { name: "Expense", fetch: () => prisma.expense.findMany() },
  { name: "ExpenseOccurrence", fetch: () => prisma.expenseOccurrence.findMany() },
  { name: "ManualIncome", fetch: () => prisma.manualIncome.findMany() },
  { name: "Payout", fetch: () => prisma.payout.findMany() },
  { name: "Notification", fetch: () => prisma.notification.findMany() },
  { name: "AuditLog", fetch: () => prisma.auditLog.findMany() },
  { name: "Lead", fetch: () => prisma.lead.findMany() },
  { name: "LeadInteraction", fetch: () => prisma.leadInteraction.findMany() },
  { name: "Material", fetch: () => prisma.material.findMany() },
  { name: "Quiz", fetch: () => prisma.quiz.findMany() },
  { name: "QuizQuestion", fetch: () => prisma.quizQuestion.findMany() },
  { name: "QuizAttempt", fetch: () => prisma.quizAttempt.findMany() },
  { name: "Certificate", fetch: () => prisma.certificate.findMany() },
  { name: "Achievement", fetch: () => prisma.achievement.findMany() },
  { name: "StudentAchievement", fetch: () => prisma.studentAchievement.findMany() },
];

async function fetchAllTables(): Promise<{ name: string; rows: Record<string, unknown>[] }[]> {
  return Promise.all(
    BACKUP_TABLES.map(async (t) => ({ name: t.name, rows: await t.fetch() }))
  );
}

export async function buildJsonBackup(): Promise<string> {
  const tables = await fetchAllTables();
  const payload = {
    generatedAt: new Date().toISOString(),
    tables: Object.fromEntries(tables.map((t) => [t.name, t.rows])),
  };
  // Date/Decimal/Json fields all serialize cleanly on their own (Date and
  // Prisma's Decimal both implement toJSON()) — no per-field handling
  // needed here, unlike the CSV path below.
  return JSON.stringify(payload, null, 2);
}

function csvCellValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  // A JSON column (teacherHistory, blockedSlots, changes, ...) comes back
  // as a plain array/object — stringify it so it survives as one CSV
  // cell. A Prisma Decimal is also an "object" but has its own toString()
  // that toCsv's escape() already calls correctly, so it's left alone.
  if (Array.isArray(value) || (value !== null && typeof value === "object" && !("toFixed" in value))) {
    return JSON.stringify(value);
  }
  return value;
}

export async function buildCsvZipBackup(): Promise<Buffer> {
  const tables = await fetchAllTables();
  const zip = new JSZip();

  for (const t of tables) {
    const rows = t.rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) out[key] = csvCellValue(value);
      return out;
    });
    zip.file(`${t.name}.csv`, toCsv(rows));
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
