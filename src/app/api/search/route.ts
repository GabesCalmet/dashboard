import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results: { type: string; label: string; sublabel?: string; href: string }[] = [];

  const studentWhere =
    user.role === "TEACHER" && user.teacherProfile
      ? { teacherId: user.teacherProfile.id, user: { name: { contains: q, mode: "insensitive" as const } } }
      : user.role === "STUDENT"
      ? { id: "__none__" }
      : { user: { name: { contains: q, mode: "insensitive" as const } } };

  const base = user.role === "ADMIN" ? "admin" : user.role === "COORDINATOR" ? "coordinator" : "teacher";

  if (user.role !== "STUDENT") {
    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      include: { user: true },
      take: 6,
    });
    for (const s of students) {
      results.push({
        type: "Aluno",
        label: s.user.name,
        sublabel: s.level,
        href: `/${base}/students/${s.id}`,
      });
    }
  }

  if (user.role === "ADMIN" || user.role === "COORDINATOR") {
    const teachers = await prisma.teacherProfile.findMany({
      where: { user: { name: { contains: q, mode: "insensitive" } } },
      include: { user: true },
      take: 6,
    });
    for (const t of teachers) {
      results.push({
        type: "Professor",
        label: t.user.name,
        sublabel: t.specialties.join(", "),
        href: `/${base}/teachers/${t.id}`,
      });
    }
  }

  return NextResponse.json({ results });
}
