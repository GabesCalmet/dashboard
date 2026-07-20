import { prisma } from "@/lib/prisma";

export async function getStudentProgressData(studentId: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
  });

  const completedLessons = await prisma.lesson.findMany({
    where: { studentId, status: "COMPLETED" },
    select: { vocabulary: true, grammar: true, speaking: true, listening: true },
  });

  const total = completedLessons.length;
  const pct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  const skills = {
    vocabulary: pct(completedLessons.filter((l) => l.vocabulary).length),
    grammar: pct(completedLessons.filter((l) => l.grammar).length),
    speaking: pct(completedLessons.filter((l) => l.speaking).length),
    listening: pct(completedLessons.filter((l) => l.listening).length),
  };

  return { student, skills, lessonsWithData: total };
}
