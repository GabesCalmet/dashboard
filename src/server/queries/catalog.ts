import { prisma } from "@/lib/prisma";

export async function listCoursesWithUsage() {
  const courses = await prisma.course.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });
  return courses;
}

export async function listPlansWithUsage() {
  const plans = await prisma.plan.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });
  return plans;
}
