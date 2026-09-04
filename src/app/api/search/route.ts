import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results: { type: string; label: string; sublabel?: string; href: string }[] = [];

  // Matches the primary student, the group's own name, or any individual
  // group member — a "grupo" cadastro's participants need to be findable
  // by their own name too, even though they all share one profile/page.
  const nameMatch = { contains: q, mode: "insensitive" as const };
  const studentOr = [
    { user: { name: nameMatch } },
    { groupName: nameMatch },
    { groupMembers: { some: { user: { name: nameMatch } } } },
  ];
  const studentWhere =
    user.role === "TEACHER" && user.teacherProfile
      ? { teacherId: user.teacherProfile.id, OR: studentOr }
      : user.role === "STUDENT"
      ? { id: "__none__" }
      : { OR: studentOr };

  const base = user.role === "ADMIN" ? "admin" : user.role === "COORDINATOR" ? "coordinator" : "teacher";

  if (user.role !== "STUDENT") {
    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      include: { user: true, groupMembers: { include: { user: true } } },
      take: 6,
    });
    const lowerQ = q.toLowerCase();
    for (const s of students) {
      const href = `/${base}/students/${s.id}`;
      const groupLabel = s.groupName ? `Grupo: ${s.groupName}` : `Grupo de ${s.user.name}`;

      if (s.user.name.toLowerCase().includes(lowerQ)) {
        results.push({
          type: "Aluno",
          label: s.user.name,
          sublabel: s.groupName ? groupLabel : s.level,
          href,
        });
      }
      if (s.groupName && s.groupName.toLowerCase().includes(lowerQ)) {
        results.push({ type: "Grupo", label: s.groupName, sublabel: s.user.name, href });
      }
      for (const m of s.groupMembers) {
        if (m.user.name.toLowerCase().includes(lowerQ)) {
          results.push({ type: "Aluno", label: m.user.name, sublabel: groupLabel, href });
        }
      }
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
