import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

// A class "happened" in some recorded sense if it's OK (dada), NC (não
// compareceu) or R (reposição) — as opposed to still SCHEDULED or one of
// the cancellation codes, which never occurred.
const REALIZED_STATUSES = ["COMPLETED", "NO_SHOW", "MAKEUP"] as const;

export async function listTeachers() {
  // Includes inactive teachers too (not just active) so admins can find and
  // reactivate them from the same list instead of only via Usuários.
  const teachers = await prisma.teacherProfile.findMany({
    include: { user: true, students: true },
    orderBy: [{ user: { active: "desc" } }, { user: { name: "asc" } }],
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return Promise.all(
    teachers.map(async (t) => {
      // "Esperadas" — how many classes their current active students are
      // contracted for this month. "Realizadas" — how many actually
      // happened (OK/NC/R), whichever is lower or higher depending on the
      // month, since either can vary independently.
      const activeStudentsList = t.students.filter((s) => s.status === "ACTIVE");
      const expectedLessonsThisMonth = activeStudentsList.reduce(
        (sum, s) => sum + s.lessonsPerMonth,
        0
      );
      const actualLessonsThisMonth = await prisma.lesson.count({
        where: {
          teacherId: t.id,
          scheduledAt: { gte: monthStart, lte: monthEnd },
          status: { in: [...REALIZED_STATUSES] },
        },
      });
      return {
        ...t,
        expectedLessonsThisMonth,
        actualLessonsThisMonth,
        activeStudents: activeStudentsList.length,
      };
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
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const todayLessons = await prisma.lesson.count({
    where: { teacherId, scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) } },
  });
  const completedTotal = await prisma.lesson.count({
    where: { teacherId, status: "COMPLETED" },
  });
  const actualLessonsThisMonth = await prisma.lesson.count({
    where: {
      teacherId,
      scheduledAt: { gte: monthStart, lte: monthEnd },
      status: { in: [...REALIZED_STATUSES] },
    },
  });
  const expectedLessonsThisMonth = teacher.students
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + s.lessonsPerMonth, 0);

  return {
    ...teacher,
    todayLessons,
    completedTotal,
    actualLessonsThisMonth,
    expectedLessonsThisMonth,
  };
}
