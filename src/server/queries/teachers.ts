import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export async function listTeachers() {
  const teachers = await prisma.teacherProfile.findMany({
    where: { user: { active: true } },
    include: { user: true, students: true },
    orderBy: { user: { name: "asc" } },
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return Promise.all(
    teachers.map(async (t) => {
      const lessonsThisMonth = await prisma.lesson.count({
        where: { teacherId: t.id, scheduledAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
      });
      return { ...t, lessonsThisMonth, activeStudents: t.students.filter((s) => s.status === "ACTIVE").length };
    })
  );
}

export async function getTeacherDetail(teacherId: string) {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      user: true,
      students: { include: { user: true } },
      lessons: { orderBy: { scheduledAt: "desc" }, take: 50 },
    },
  });
  if (!teacher) return null;

  const now = new Date();
  const todayLessons = await prisma.lesson.count({
    where: { teacherId, scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) } },
  });
  const completedTotal = await prisma.lesson.count({
    where: { teacherId, status: "COMPLETED" },
  });

  return { ...teacher, todayLessons, completedTotal };
}
