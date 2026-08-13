import { prisma } from "@/lib/prisma";

export async function getStudentProgressData(studentId: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
  });

  return { student };
}
