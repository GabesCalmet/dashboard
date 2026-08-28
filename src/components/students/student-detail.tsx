import Link from "next/link";
import { endOfMonth, startOfMonth } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Repeat,
  UserX,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/stat-card";
import { MonthNav } from "@/components/financial/month-nav";
import { LevelProgressCard } from "@/components/students/level-progress-card";
import { LessonHistoryTable } from "@/components/students/lesson-history-table";
import { StudentPaymentsTable, type PaymentHistoryRow } from "@/components/students/student-payments-table";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import type { ScheduleEntry } from "@/components/students/lesson-schedule-editor";
import type { ValueHistoryEntry } from "@/components/students/monthly-value-history-editor";
import type { SelectHistoryEntry } from "@/components/students/select-history-editor";
import { DeleteStudentButton } from "@/components/students/delete-student-button";
import { ResyncLessonsButton } from "@/components/students/resync-lessons-button";
import { ViewCredentialsButton } from "@/components/shared/view-credentials-button";
import { SetPasswordButton } from "@/components/shared/set-password-button";
import { AuditTrail } from "@/components/shared/audit-trail";
import {
  studentStatusLabel,
  studentStatusVariant,
  formatDate,
  formatDateTime,
  bankAccountLabel,
  formatCurrency,
} from "@/lib/labels";
import type { getStudentDetail } from "@/server/queries/students";

type Student = NonNullable<Awaited<ReturnType<typeof getStudentDetail>>>;

export function StudentDetailView({
  student,
  basePath,
  permissions,
  editOptions,
  auditEntries = [],
  monthNav,
  paymentHistory = [],
  initialTab,
}: {
  student: Student;
  basePath: string;
  // Opens a specific tab on load — e.g. "financial" when arriving from the
  // global search while browsing the Financeiro section.
  initialTab?: string;
  // Full billing picture (real + placeholder) for the Financeiro tab —
  // only fetched/passed by pages that set permissions.showFinancial.
  paymentHistory?: PaymentHistoryRow[];
  // Lets "Aulas contratadas/mês" be checked for a past month instead of
  // only the real current one. selfPath is this same page's URL (no query),
  // used to build the ?month=YYYY-MM prev/next links.
  monthNav?: { year: number; month: number; selfPath: string };
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canManageLevel: boolean;
    canPromote: boolean;
    showFinancial: boolean;
    showAudit: boolean;
    // Lets status/reagendamento/resumo be changed directly from this page
    // (admin), instead of only from the teacher's own Relatórios/Agenda.
    canEditLessons?: boolean;
    // Teachers only need the lesson history day-to-day, not cadastro data
    // (CPF, address, billing info) — defaults to shown for admin/coordinator.
    showOverview?: boolean;
  };
  editOptions?: {
    teachers: { id: string; label: string }[];
    courses: { id: string; label: string }[];
    plans: { id: string; label: string }[];
  };
  auditEntries?: Parameters<typeof AuditTrail>[0]["entries"];
}) {
  // The number of classes actually scheduled this calendar month varies —
  // months don't all contain the same number of each weekday — so this
  // counts the student's real recurring lessons for the current month
  // instead of showing the flat lessonsPerMonth contract value. Reposições
  // (rescheduledFromId set) are extra makeup slots, not part of the regular
  // weekly schedule, so they're excluded here.
  const refMonthDate = monthNav ? new Date(monthNav.year, monthNav.month, 1) : new Date();
  const monthStart = startOfMonth(refMonthDate);
  const monthEnd = endOfMonth(refMonthDate);
  const contractedLessonsThisMonth = student.lessons.filter(
    (l) => l.scheduledAt >= monthStart && l.scheduledAt <= monthEnd && !l.rescheduledFromId
  ).length;
  const completedLessons = student.lessons.filter((l) => l.status === "COMPLETED").length;
  const canceledByStudent = student.lessons.filter((l) => l.status === "CANCELED_BY_STUDENT").length;
  const canceledByTeacher = student.lessons.filter((l) => l.status === "CANCELED_BY_TEACHER").length;
  // A reposição lesson is any record booked via rescheduledFromId — counts
  // here whether it's still pending or already marked "dada" (in which case
  // its status flips to COMPLETED, so it's also folded into completedLessons
  // above).
  const makeupCount = student.lessons.filter((l) => l.rescheduledFromId).length;
  const noShowCount = student.lessons.filter((l) => l.status === "NO_SHOW").length;
  // "Realizada" = the lesson slot actually happened (teacher held it), even
  // if the student didn't show up (NC) — as opposed to "Dada" (OK), which
  // only counts lessons the student actually attended. A reposição only
  // counts once it's been given, at which point it's already COMPLETED, so
  // it doesn't need to be added separately here.
  const realizedLessons = completedLessons + noShowCount;
  const nextLesson = student.lessons
    .filter((l) => l.scheduledAt > new Date() && l.status === "SCHEDULED")
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];

  return (
    <div>
      <Link
        href={basePath}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para alunos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {student.user.avatarUrl && <AvatarImage src={student.user.avatarUrl} />}
            <AvatarFallback className="text-lg">
              {student.user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{student.user.name}</h1>
              <Badge variant={studentStatusVariant[student.status]}>
                {studentStatusLabel[student.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">@{student.user.username}</p>
            {student.user.email && (
              <p className="text-xs text-muted-foreground">{student.user.email}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {student.course?.name ?? "Curso não definido"} · Prof.{" "}
              {student.teacher?.user.name ?? "não atribuído"}
            </p>
          </div>
        </div>
        {(permissions.canEdit || permissions.canDelete) && (
          <div className="flex items-center gap-2">
            {permissions.canEdit && editOptions && (
              <StudentFormDialog
                teachers={editOptions.teachers}
                courses={editOptions.courses}
                plans={editOptions.plans}
                student={{
                  id: student.id,
                  name: student.user.name,
                  username: student.user.username,
                  email: student.user.email,
                  cpf: student.cpf,
                  phone: student.user.phone,
                  birthDate: student.birthDate?.toISOString().slice(0, 10),
                  address: student.address,
                  meetLink: student.meetLink,
                  teacherId: student.teacherId,
                  teacherHistory: parseSelectHistory(student.teacherHistory),
                  courseId: student.courseId,
                  courseHistory: parseSelectHistory(student.courseHistory),
                  planId: student.planId,
                  planHistory: parseSelectHistory(student.planHistory),
                  monthlyValue: Number(student.monthlyValue),
                  monthlyValueHistory: parseValueHistory(student.monthlyValueHistory),
                  bankAccount: student.bankAccount,
                  dueDay: student.dueDay,
                  thirdPartyPayerName: student.thirdPartyPayerName,
                  thirdPartyAmount: student.thirdPartyAmount ? Number(student.thirdPartyAmount) : null,
                  thirdPartyDueDay: student.thirdPartyDueDay,
                  thirdPartyBankAccount: student.thirdPartyBankAccount,
                  lessonsPerMonth: student.lessonsPerMonth,
                  lessonSchedule: parseLessonSchedule(student.lessonSchedule),
                  level: student.level,
                  startDate: student.startDate.toISOString().slice(0, 10),
                  endDate: student.endDate?.toISOString().slice(0, 10),
                  objective: student.objective,
                  notes: student.notes,
                  status: student.status,
                }}
              />
            )}
            {permissions.canEdit && <ResyncLessonsButton studentId={student.id} />}
            {permissions.canEdit && <ViewCredentialsButton userId={student.userId} />}
            {permissions.canEdit && <SetPasswordButton userId={student.userId} />}
            {permissions.canDelete && (
              <DeleteStudentButton studentId={student.id} redirectTo={basePath} />
            )}
          </div>
        )}
      </div>

      {monthNav && (
        <div className="mb-3 flex justify-start">
          <MonthNav basePath={monthNav.selfPath} year={monthNav.year} month={monthNav.month} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Aulas contratadas/mês"
          value={String(contractedLessonsThisMonth)}
          icon={BookOpen}
        />
        <StatCard label="Aulas realizadas" value={String(realizedLessons)} icon={GraduationCap} accent />
        <StatCard
          label="Próxima aula"
          value={nextLesson ? formatDateTime(nextLesson.scheduledAt) : "—"}
          icon={CalendarClock}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="OK — Aulas dadas" value={String(completedLessons)} icon={CheckCircle2} accent />
        <StatCard label="CA — Cancelamento aluno" value={String(canceledByStudent)} icon={XCircle} />
        <StatCard label="CP — Cancelamento professor" value={String(canceledByTeacher)} icon={XCircle} />
        <StatCard label="R — Reposições" value={String(makeupCount)} icon={Repeat} />
        <StatCard label="NC — Não compareceu" value={String(noShowCount)} icon={UserX} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs
            defaultValue={
              initialTab === "financial" && permissions.showFinancial
                ? "financial"
                : permissions.showOverview === false
                  ? "lessons"
                  : "overview"
            }
          >
            <TabsList>
              {permissions.showOverview !== false && (
                <TabsTrigger value="overview">Visão geral</TabsTrigger>
              )}
              <TabsTrigger value="lessons">Histórico de aulas</TabsTrigger>
              {permissions.showFinancial && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
              {permissions.showAudit && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
            </TabsList>

            {permissions.showOverview !== false && (
            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dados cadastrais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <InfoRow label="CPF" value={student.cpf ?? "—"} />
                  <InfoRow label="Telefone" value={student.user.phone ?? "—"} />
                  <InfoRow
                    label="Nascimento"
                    value={student.birthDate ? formatDate(student.birthDate) : "—"}
                  />
                  <InfoRow label="Endereço" value={student.address ?? "—"} />
                  <InfoRow label="Link do Meet" value={student.meetLink ?? "—"} />
                  <InfoRow label="Início do curso" value={formatDate(student.startDate)} />
                  <InfoRow
                    label="Término previsto"
                    value={student.endDate ? formatDate(student.endDate) : "—"}
                  />
                  <InfoRow label="Plano" value={student.plan?.name ?? "—"} />
                  <InfoRow
                    label="Dia(s)/horário da aula"
                    value={formatLessonSchedule(parseLessonSchedule(student.lessonSchedule))}
                  />
                  <InfoRow label="Vencimento do boleto" value={`Dia ${student.dueDay}`} />
                  <InfoRow label="Conta bancária" value={bankAccountLabel[student.bankAccount]} />
                  {student.thirdPartyAmount && (
                    <>
                      <InfoRow
                        label="Pago por terceiro"
                        value={`${student.thirdPartyPayerName} — ${formatCurrency(student.thirdPartyAmount.toString())}`}
                      />
                      <InfoRow
                        label="Vencimento (terceiro)"
                        value={`Dia ${student.thirdPartyDueDay}`}
                      />
                      <InfoRow
                        label="Conta bancária (terceiro)"
                        value={bankAccountLabel[student.thirdPartyBankAccount ?? student.bankAccount]}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {student.notes || "Nenhuma observação registrada."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            )}

            <TabsContent value="lessons" className="mt-4">
              <LessonHistoryTable
                lessons={student.lessons}
                editable={permissions.canEditLessons}
              />
            </TabsContent>

            {permissions.showFinancial && (
              <TabsContent value="financial" className="mt-4">
                <StudentPaymentsTable
                  payments={paymentHistory}
                  studentId={student.id}
                  editable={permissions.canEdit}
                />
              </TabsContent>
            )}

            {permissions.showAudit && (
              <TabsContent value="audit" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <AuditTrail entries={auditEntries} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-6">
          <LevelProgressCard
            studentId={student.id}
            level={student.level}
            progress={student.levelProgress}
            canManage={permissions.canManageLevel}
            canPromote={permissions.canPromote}
          />

          {student.levelHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de níveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {student.levelHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span>
                      {h.fromLevel} → {h.toLevel}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function parseSelectHistory(value: unknown): SelectHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is { id: string; from?: string; until?: string } =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).id === "string"
    )
    .map((e) => ({
      id: e.id,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

function parseValueHistory(value: unknown): ValueHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is { amount: number; from?: string; until?: string } =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).amount === "number"
    )
    .map((e) => ({
      amount: e.amount,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }));
}

function parseLessonSchedule(value: unknown): ScheduleEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is { weekday: number; start: string; end: string; from?: string; until?: string } =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Record<string, unknown>).weekday === "number"
    )
    .map((e) => ({
      weekday: e.weekday,
      start: typeof e.start === "string" ? e.start : "",
      end: typeof e.end === "string" ? e.end : "",
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
    }))
    .sort((a, b) => a.weekday - b.weekday);
}

function formatLessonSchedule(schedule: ScheduleEntry[]) {
  if (schedule.length === 0) return "—";
  return schedule
    .map((e) => {
      const day = WEEKDAY_ABBR[e.weekday];
      const time = e.start ? (e.end ? `${e.start}–${e.end}` : e.start) : "";
      let label = time ? `${day} ${time}` : day;
      if (e.from && e.until) label += ` (${formatDate(e.from)}–${formatDate(e.until)})`;
      else if (e.until) label += ` (até ${formatDate(e.until)})`;
      else if (e.from) label += ` (desde ${formatDate(e.from)})`;
      return label;
    })
    .join(", ");
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
