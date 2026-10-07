import { prisma } from "@/lib/prisma";

export async function listStudents() {
  return prisma.studentProfile.findMany({
    where: { user: { active: true } },
    include: {
      user: true,
      teacher: { include: { user: true } },
      course: true,
      plan: true,
      groupMembers: { include: { user: true } },
    },
    // Active students first, then paused, then canceled — StudentStatus is
    // declared in exactly that order (see schema.prisma), which Postgres
    // enums sort by natively. Most recently enrolled first within each
    // status group, same ordering as before this was added.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

// Only ACTIVE students — a teacher shouldn't see (or have counted toward
// their roster) a student who's been paused or canceled; that's admin/
// coordinator territory (Alunos pausados/cancelados on the management
// dashboard) from here on.
export async function listStudentsForTeacher(teacherId: string) {
  return prisma.studentProfile.findMany({
    where: { teacherId, status: "ACTIVE", user: { active: true } },
    include: {
      user: true,
      teacher: { include: { user: true } },
      course: true,
      plan: true,
      groupMembers: { include: { user: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export async function getStudentDetail(studentId: string) {
  return prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      teacher: { include: { user: true } },
      course: true,
      plan: true,
      lessons: { orderBy: { scheduledAt: "asc" }, include: { rescheduledTo: true } },
      payments: { orderBy: { referenceMonth: "desc" } },
      levelHistory: { orderBy: { createdAt: "desc" } },
      groupMembers: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

// Minimal lookup used only to resolve the billing-cycle window a monthly
// report should cover (see dueDateFor/resolveHistoricalAmount call sites in
// the report route) before fetching the full report data for that window —
// needed up front since the window itself depends on the student's dueDay.
export async function getStudentDueDayInfo(studentId: string) {
  return prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { dueDay: true, dueDayHistory: true },
  });
}

// Just enough to build one student's "Relatório Mensal de Aulas" PDF for a
// given period — the student/teacher names, their flat contracted lesson
// count (for "Aulas contratadas", independent of how many weekdays this
// particular period actually has), and every lesson scheduled within it
// (for the stat boxes and the "Detalhamento das aulas" table). The period
// is the billing cycle (previous due date through this one), not the
// calendar month — see the report route for how periodStart/periodEnd are
// resolved.
export async function getStudentMonthlyReportData(
  studentId: string,
  periodStart: Date,
  periodEnd: Date
) {
  return prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      teacher: { include: { user: true } },
      lessons: {
        where: { scheduledAt: { gte: periodStart, lte: periodEnd } },
        orderBy: { scheduledAt: "asc" },
        include: {
          // For the Observações column: a canceled lesson shows when its
          // reposição was (re)scheduled for, and a reposição lesson shows
          // which original canceled class it's replacing.
          rescheduledTo: { select: { scheduledAt: true } },
          rescheduledFrom: { select: { scheduledAt: true } },
        },
      },
    },
  });
}

export async function listActiveTeachersForSelect() {
  return prisma.teacherProfile.findMany({
    where: { user: { active: true } },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
}

export async function listCoursesForSelect() {
  return prisma.course.findMany({ orderBy: { name: "asc" } });
}

export async function listPlansForSelect() {
  return prisma.plan.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}
