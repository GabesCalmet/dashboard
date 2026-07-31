import { prisma } from "@/lib/prisma";

// Shared shape for the in-app Relatórios tables (as opposed to the CSV
// exports in /admin/reports, which cover the same data for download).
const reportInclude = {
  student: { include: { user: true } },
  teacher: { include: { user: true } },
  rescheduledTo: true,
} as const;

export async function listLessonsForTeacher(teacherId: string, take = 200) {
  return prisma.lesson.findMany({
    where: { teacherId },
    include: reportInclude,
    orderBy: { scheduledAt: "desc" },
    take,
  });
}

export async function listLessonsForStudent(studentId: string, take = 200) {
  return prisma.lesson.findMany({
    where: { studentId },
    include: reportInclude,
    orderBy: { scheduledAt: "desc" },
    take,
  });
}

export async function listAllLessons(take = 500) {
  return prisma.lesson.findMany({
    include: reportInclude,
    orderBy: { scheduledAt: "desc" },
    take,
  });
}
