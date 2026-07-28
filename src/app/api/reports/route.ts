import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import {
  levelLabel,
  lessonStatusLabel,
  paymentStatusLabel,
  studentStatusLabel,
} from "@/lib/labels";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "COORDINATOR")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type");

  switch (type) {
    case "students": {
      const students = await prisma.studentProfile.findMany({
        include: { user: true, teacher: { include: { user: true } }, course: true },
      });
      return csvResponse(
        "alunos.csv",
        students.map((s) => ({
          Nome: s.user.name,
          Usuario: s.user.username,
          Email: s.user.email,
          Nivel: levelLabel[s.level],
          Status: studentStatusLabel[s.status],
          Professor: s.teacher?.user.name ?? "",
          Curso: s.course?.name ?? "",
          "Valor mensal": s.monthlyValue.toString(),
          "Dia vencimento": s.dueDay,
          "Aulas/mes": s.lessonsPerMonth,
          "Data inicio": s.startDate.toISOString().slice(0, 10),
        }))
      );
    }
    case "teachers": {
      const teachers = await prisma.teacherProfile.findMany({ include: { user: true } });
      return csvResponse(
        "professores.csv",
        teachers.map((t) => ({
          Nome: t.user.name,
          Usuario: t.user.username,
          Email: t.user.email,
          Especialidades: t.specialties.join(", "),
          "Valor/hora": t.hourlyRate.toString(),
          "Carga horaria": t.weeklyHours,
          Admissao: t.admissionDate.toISOString().slice(0, 10),
        }))
      );
    }
    case "lessons": {
      const lessons = await prisma.lesson.findMany({
        include: { student: { include: { user: true } }, teacher: { include: { user: true } } },
        orderBy: { scheduledAt: "desc" },
        take: 2000,
      });
      return csvResponse(
        "aulas.csv",
        lessons.map((l) => ({
          Data: l.scheduledAt.toISOString(),
          Aluno: l.student.user.name,
          Professor: l.teacher.user.name,
          "Duracao (min)": l.durationMin,
          Status: lessonStatusLabel[l.status],
          Homework: l.homework ?? "",
        }))
      );
    }
    case "financial": {
      const payments = await prisma.payment.findMany({
        include: { student: { include: { user: true } } },
        orderBy: { referenceMonth: "desc" },
      });
      return csvResponse(
        "financeiro.csv",
        payments.map((p) => ({
          Aluno: p.student.user.name,
          "Mes referencia": p.referenceMonth.toISOString().slice(0, 7),
          Valor: p.amount.toString(),
          Vencimento: p.dueDate.toISOString().slice(0, 10),
          "Pago em": p.paidAt?.toISOString().slice(0, 10) ?? "",
          Status: paymentStatusLabel[p.status],
        }))
      );
    }
    case "cancellations": {
      const lessons = await prisma.lesson.findMany({
        where: {
          status: {
            in: ["CANCELED_BY_STUDENT", "CANCELED_BY_TEACHER", "CANCELED_HOLIDAY", "NO_SHOW"],
          },
        },
        include: { student: { include: { user: true } }, teacher: { include: { user: true } } },
        orderBy: { scheduledAt: "desc" },
      });
      return csvResponse(
        "cancelamentos.csv",
        lessons.map((l) => ({
          Data: l.scheduledAt.toISOString(),
          Aluno: l.student.user.name,
          Professor: l.teacher.user.name,
          Status: lessonStatusLabel[l.status],
        }))
      );
    }
    case "makeups": {
      const lessons = await prisma.lesson.findMany({
        where: { status: "MAKEUP" },
        include: { student: { include: { user: true } }, teacher: { include: { user: true } } },
        orderBy: { scheduledAt: "desc" },
      });
      return csvResponse(
        "reposicoes.csv",
        lessons.map((l) => ({
          Data: l.scheduledAt.toISOString(),
          Aluno: l.student.user.name,
          Professor: l.teacher.user.name,
        }))
      );
    }
    case "hours": {
      const teachers = await prisma.teacherProfile.findMany({ include: { user: true } });
      const rows = await Promise.all(
        teachers.map(async (t) => {
          const agg = await prisma.lesson.aggregate({
            where: { teacherId: t.id, status: "COMPLETED" },
            _sum: { durationMin: true },
          });
          return {
            Professor: t.user.name,
            "Horas trabalhadas": ((agg._sum.durationMin ?? 0) / 60).toFixed(1),
          };
        })
      );
      return csvResponse("horas_trabalhadas.csv", rows);
    }
    default:
      return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
  }
}
