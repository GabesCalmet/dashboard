import { prisma } from "@/lib/prisma";

export async function listStudents() {
  return prisma.studentProfile.findMany({
    where: { user: { active: true } },
    include: { user: true, teacher: { include: { user: true } }, course: true, plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listStudentsForTeacher(teacherId: string) {
  return prisma.studentProfile.findMany({
    where: { teacherId, user: { active: true } },
    include: { user: true, teacher: { include: { user: true } }, course: true, plan: true },
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
      lessons: { orderBy: { scheduledAt: "desc" } },
      payments: { orderBy: { referenceMonth: "desc" } },
      levelHistory: { orderBy: { createdAt: "desc" } },
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
