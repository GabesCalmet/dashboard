/**
 * Demo data seed for Upfront Portal.
 *
 * Requires a real Supabase project: this script creates actual Supabase Auth
 * users (via the service-role admin API) for every demo account, so
 * NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL in
 * `.env` must point at a real project before running `npm run db:seed`.
 */
import { prisma } from "../src/lib/prisma";
import { provisionUserAccount } from "../src/server/accounts";

const DEMO_PASSWORD = "Upfront@2026";

async function upsertDemoUser(params: {
  name: string;
  email: string;
  role: "ADMIN" | "COORDINATOR" | "TEACHER" | "STUDENT";
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) return existing;

  const { user } = await provisionUserAccount(params);
  // Overwrite the random temp password with a memorable one for the demo.
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  await createAdminClient().auth.admin.updateUserById(user.id, { password: DEMO_PASSWORD });
  return user;
}

async function main() {
  console.log("Seeding Upfront Portal demo data...");

  const [general, business, conversation] = await Promise.all([
    prisma.course.upsert({
      where: { id: "seed-course-general" },
      update: {},
      create: { id: "seed-course-general", name: "General English", description: "Curso geral de inglês" },
    }),
    prisma.course.upsert({
      where: { id: "seed-course-business" },
      update: {},
      create: { id: "seed-course-business", name: "Business English", description: "Inglês para negócios" },
    }),
    prisma.course.upsert({
      where: { id: "seed-course-conversation" },
      update: {},
      create: { id: "seed-course-conversation", name: "Conversação", description: "Foco em conversação e fluência" },
    }),
  ]);

  const [planStandard, planIntensive] = await Promise.all([
    prisma.plan.upsert({
      where: { id: "seed-plan-standard" },
      update: {},
      create: { id: "seed-plan-standard", name: "Standard 4x/mês", price: 400, lessonsPerMonth: 4 },
    }),
    prisma.plan.upsert({
      where: { id: "seed-plan-intensive" },
      update: {},
      create: { id: "seed-plan-intensive", name: "Intensivo 8x/mês", price: 720, lessonsPerMonth: 8 },
    }),
  ]);

  const admin = await upsertDemoUser({
    name: "Ana Diretora",
    email: "admin@upfront.com",
    role: "ADMIN",
  });

  await upsertDemoUser({
    name: "Bruno Coordenador",
    email: "coordenador@upfront.com",
    role: "COORDINATOR",
  });

  const teacherUser1 = await upsertDemoUser({
    name: "Camila Teacher",
    email: "professora.camila@upfront.com",
    role: "TEACHER",
  });
  const teacherUser2 = await upsertDemoUser({
    name: "Daniel Teacher",
    email: "professor.daniel@upfront.com",
    role: "TEACHER",
  });

  const teacher1 =
    (await prisma.teacherProfile.findUnique({ where: { userId: teacherUser1.id } })) ??
    (await prisma.teacherProfile.create({
      data: {
        userId: teacherUser1.id,
        specialties: ["Conversação", "Business English"],
        hourlyRate: 80,
        weeklyHours: 20,
        admissionDate: new Date("2024-02-01"),
      },
    }));

  const teacher2 =
    (await prisma.teacherProfile.findUnique({ where: { userId: teacherUser2.id } })) ??
    (await prisma.teacherProfile.create({
      data: {
        userId: teacherUser2.id,
        specialties: ["General English", "TOEFL"],
        hourlyRate: 75,
        weeklyHours: 15,
        admissionDate: new Date("2024-06-15"),
      },
    }));

  const studentSeeds = [
    {
      name: "João Aluno",
      email: "aluno.joao@upfront.com",
      teacher: teacher1,
      course: general,
      plan: planStandard,
      level: "A2" as const,
      levelProgress: 60,
    },
    {
      name: "Maria Aluna",
      email: "aluna.maria@upfront.com",
      teacher: teacher1,
      course: business,
      plan: planIntensive,
      level: "B1" as const,
      levelProgress: 30,
    },
    {
      name: "Pedro Aluno",
      email: "aluno.pedro@upfront.com",
      teacher: teacher2,
      course: conversation,
      plan: planStandard,
      level: "A1" as const,
      levelProgress: 85,
    },
  ];

  for (const s of studentSeeds) {
    const studentUser = await upsertDemoUser({ name: s.name, email: s.email, role: "STUDENT" });
    const student =
      (await prisma.studentProfile.findUnique({ where: { userId: studentUser.id } })) ??
      (await prisma.studentProfile.create({
        data: {
          userId: studentUser.id,
          teacherId: s.teacher.id,
          courseId: s.course.id,
          planId: s.plan.id,
          monthlyValue: s.plan.price,
          lessonsPerMonth: s.plan.lessonsPerMonth,
          lessonWeekdays: [2],
          lessonTime: "18:00",
          lessonEndTime: "18:50",
          level: s.level,
          levelProgress: s.levelProgress,
          startDate: new Date("2025-03-01"),
          objective: "Fluência para viagens e trabalho",
          status: "ACTIVE",
        },
      }));

    const existingLessons = await prisma.lesson.count({ where: { studentId: student.id } });
    if (existingLessons === 0) {
      const now = new Date();
      for (let i = 4; i >= 1; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i * 7);
        await prisma.lesson.create({
          data: {
            studentId: student.id,
            teacherId: s.teacher.id,
            scheduledAt: date,
            durationMin: 50,
            status: "COMPLETED",
            contentTaught: "Past simple, vocabulário de viagens",
            vocabulary: "airport, luggage, boarding pass",
            grammar: "Past simple affirmative/negative",
            speaking: "Roleplay: check-in no aeroporto",
            listening: "Áudio: anúncios de aeroporto",
            homework: "Exercícios de past simple, unidade 4",
            observations: "Bom progresso em vocabulário.",
            reportedAt: date,
          },
        });
      }
      const nextLesson = new Date(now);
      nextLesson.setDate(nextLesson.getDate() + 3);
      await prisma.lesson.create({
        data: {
          studentId: student.id,
          teacherId: s.teacher.id,
          scheduledAt: nextLesson,
          durationMin: 50,
          status: "SCHEDULED",
        },
      });

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      await prisma.payment.create({
        data: {
          studentId: student.id,
          referenceMonth: monthStart,
          amount: s.plan.price,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
          status: "PAID",
          paidAt: new Date(now.getFullYear(), now.getMonth(), 5),
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo login credentials (password for all: %s):", DEMO_PASSWORD);
  console.log("  Admin:        admin@upfront.com");
  console.log("  Coordenador:  coordenador@upfront.com");
  console.log("  Professores:  professora.camila@upfront.com / professor.daniel@upfront.com");
  console.log("  Alunos:       aluno.joao@upfront.com / aluna.maria@upfront.com / aluno.pedro@upfront.com");
  console.log("Admin id:", admin.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
