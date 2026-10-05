import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableTeachers } from "@/server/queries/availability";

// Backs the "seg 17-18" style search in the global search box — same
// gating as the Professor results in /api/search, since this exists for
// the same purpose (finding a teacher to assign a student to).
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "COORDINATOR")) {
    return NextResponse.json({ results: [] }, { status: user ? 403 : 401 });
  }

  const weekdayParam = request.nextUrl.searchParams.get("weekday");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ results: [] });

  const weekday = weekdayParam !== null && weekdayParam !== "" ? Number(weekdayParam) : undefined;
  const teachers = await getAvailableTeachers({ weekday, start, end });

  const WEEKDAY_NAME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const sublabel =
    weekday !== undefined
      ? `Livre ${WEEKDAY_NAME[weekday]} ${start}-${end}`
      : `Livre todo dia ${start}-${end}`;

  return NextResponse.json({
    results: teachers.map((t) => ({
      type: "Disponível",
      label: t.name,
      sublabel,
      href: `/teachers/${t.id}`,
    })),
  });
}
