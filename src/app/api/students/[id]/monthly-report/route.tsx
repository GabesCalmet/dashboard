import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { getStudentMonthlyReportData } from "@/server/queries/students";
import { lessonStatusDisplayLabel } from "@/lib/labels";
import { toBrazilDateString, toBrazilTimeString } from "@/lib/timezone";
import {
  MonthlyReportDocument,
  type MonthlyReportRow,
  type StatusTone,
} from "@/server/pdf/monthly-report-document";
import type { LessonStatus } from "@prisma/client";

function statusTone(status: LessonStatus, isMakeup: boolean): StatusTone {
  if (isMakeup) return "makeup";
  if (status === "COMPLETED") return "completed";
  if (status === "SCHEDULED") return "neutral";
  return "canceled"; // every CANCELED_*/NO_SHOW variant
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "COORDINATOR")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id: studentId } = await context.params;
  const now = new Date();
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth();
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: "Mês inválido" }, { status: 400 });
  }

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const student = await getStudentMonthlyReportData(studentId, monthStart, monthEnd);
  if (!student) {
    return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  }

  // Aulas contratadas is the flat number the student pays for (e.g. "2x por
  // semana" = 8/mês), independent of how many weekdays this particular
  // month actually has. Aulas extras is the surplus beyond that flat
  // number when a month's calendar happens to fit one more regular class
  // than usual (e.g. 5 Mondays instead of 4) — makeup lessons are counted
  // separately (Aulas reagendadas) and never inflate this.
  const regularLessons = student.lessons.filter((l) => !l.isMakeup);
  const makeupLessons = student.lessons.filter((l) => l.isMakeup);
  const aulasContratadas = student.lessonsPerMonth;
  const aulasExtras = Math.max(0, regularLessons.length - student.lessonsPerMonth);
  const aulasReagendadas = makeupLessons.length;
  const aulasRealizadas = student.lessons.filter((l) => l.status === "COMPLETED").length;

  const rows: MonthlyReportRow[] = student.lessons.map((l) => {
    const [, m, d] = toBrazilDateString(l.scheduledAt).split("-");
    return {
      data: `${d}/${m}`,
      horario: toBrazilTimeString(l.scheduledAt),
      status: lessonStatusDisplayLabel(l.status, l.isMakeup),
      statusTone: statusTone(l.status, l.isMakeup),
      observacoes: l.contentTaught ?? "",
    };
  });

  const period = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    monthStart
  );
  const studentName = student.groupName ?? student.user.name;

  const pdfBuffer = await renderToBuffer(
    <MonthlyReportDocument
      studentName={studentName}
      period={period}
      teacherName={student.teacher?.user.name ?? "Não atribuído"}
      aulasContratadas={aulasContratadas}
      aulasRealizadas={aulasRealizadas}
      aulasReagendadas={aulasReagendadas}
      aulasExtras={aulasExtras}
      rows={rows}
    />
  );

  const slug = studentName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const filename = `relatorio-${slug}-${year}-${String(month + 1).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
