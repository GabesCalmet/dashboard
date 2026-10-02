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
    orderBy: { createdAt: "desc" },
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

// Just enough to build one student's "Relatório Mensal de Aulas" PDF for a
// given month — the student/teacher names, their flat contracted lesson
// count (for "Aulas contratadas", independent of how many weekdays this
// particular month actually has), and every lesson scheduled in that exact
// month (for the stat boxes and the "Detalhamento das aulas" table).
export async function getStudentMonthlyReportData(
  studentId: string,
  monthStart: Date,
  monthEnd: Date
) {
  return prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      teacher: { include: { user: true } },
      lessons: {
        where: { scheduledAt: { gte: monthStart, lte: monthEnd } },
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
