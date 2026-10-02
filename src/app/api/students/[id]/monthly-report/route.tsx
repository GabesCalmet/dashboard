import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { getStudentMonthlyReportData } from "@/server/queries/students";
import { lessonStatusDisplayLabel } from "@/lib/labels";
import { toBrazilDateString, toBrazilTimeString } from "@/lib/timezone";
import { reschedulableStatuses } from "@/lib/validation/lesson";
import { resolveHistoricalAmount } from "@/server/billing";
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

function brDate(date: Date): string {
  const [y, m, d] = toBrazilDateString(date).split("-");
  return `${d}/${m}/${y}`;
}

// What the Observações column says about a reagendamento, for one lesson:
// - A cancellation eligible for a reposição (CA/CP/CF) says whether one's
//   been scheduled yet, and for when.
// - A reposição lesson itself says which original canceled class it's
//   replacing.
// A lesson can be both (a reposição that was itself later canceled and
// rescheduled again) — rare, but both pieces are shown rather than one
// silently winning.
function observacoesFor(l: {
  status: LessonStatus;
  rescheduledTo: { scheduledAt: Date }[];
  rescheduledFrom: { scheduledAt: Date } | null;
}): string {
  const parts: string[] = [];
  if (l.rescheduledFrom) {
    parts.push(`Aula cancelada em ${brDate(l.rescheduledFrom.scheduledAt)}`);
  }
  if ((reschedulableStatuses as readonly string[]).includes(l.status)) {
    parts.push(
      l.rescheduledTo.length > 0
        ? `Reagendado para ${l.rescheduledTo.map((r) => brDate(r.scheduledAt)).join(", ")}`
        : "Ainda Não Reagendado"
    );
  }
  return parts.join(" · ");
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

  // Aulas contratadas is the number the student paid for that specific
  // month (e.g. "2x por semana" = 8/mês), independent of how many weekdays
  // the month actually has — resolved from lessonsPerMonthHistory instead
  // of just reading the student's current flat value, since that count can
  // change over time (e.g. 8/mês split across two days a week, later
  // consolidated into 4/mês on one day) and a report can be generated for
  // any past month. Aulas extras is the surplus beyond that contracted
  // number when a month's calendar happens to fit one more regular class
  // than usual (e.g. 5 Mondays instead of 4) — makeup lessons are counted
  // separately (Aulas reagendadas) and never inflate this.
  const regularLessons = student.lessons.filter((l) => !l.isMakeup);
  const makeupLessons = student.lessons.filter((l) => l.isMakeup);
  const aulasContratadas = resolveHistoricalAmount(
    student.lessonsPerMonth,
    student.lessonsPerMonthHistory,
    monthStart
  );
  const aulasExtras = Math.max(0, regularLessons.length - aulasContratadas);
  const aulasReagendadas = makeupLessons.length;
  const aulasRealizadas = student.lessons.filter((l) => l.status === "COMPLETED").length;

  const rows: MonthlyReportRow[] = student.lessons.map((l) => {
    const [, m, d] = toBrazilDateString(l.scheduledAt).split("-");
    return {
      data: `${d}/${m}`,
      horario: toBrazilTimeString(l.scheduledAt),
      status: lessonStatusDisplayLabel(l.status, l.isMakeup),
      statusTone: statusTone(l.status, l.isMakeup),
      observacoes: observacoesFor(l),
    };
  });

  const periodRaw = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    monthStart
  );
  // Only the leading letter is capitalized ("Outubro de 2026") — CSS
  // text-transform:capitalize would also capitalize "de", which looks wrong
  // in Portuguese.
  const period = periodRaw.charAt(0).toUpperCase() + periodRaw.slice(1);
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
      // "inline" (not "attachment") so the browser opens its own PDF
      // viewer in the new tab instead of triggering an immediate save —
      // that viewer has its own download/print controls once the user has
      // actually looked at the report.
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
