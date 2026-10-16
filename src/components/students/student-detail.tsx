import Link from "next/link";
import { endOfMonth, startOfMonth } from "date-fns";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Layers,
  Palmtree,
  PartyPopper,
  Repeat,
  UserX,
  XCircle,
} from "lucide-react";
import { resolveHistoricalAmount, dueDateFor, earliestHistoryFrom } from "@/server/billing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/stat-card";
import { MonthNav } from "@/components/financial/month-nav";
import { LessonHistoryTable } from "@/components/students/lesson-history-table";
import { StudentPaymentsTable, type PaymentHistoryRow } from "@/components/students/student-payments-table";
import { StudentChargesTable, type StudentChargeRow } from "@/components/students/student-charges-table";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import type { ScheduleEntry } from "@/components/students/lesson-schedule-editor";
import type { ValueHistoryEntry } from "@/components/students/monthly-value-history-editor";
import type { SelectHistoryEntry } from "@/components/students/select-history-editor";
import type { TeacherHistoryEntry } from "@/components/students/teacher-assignment-editor";
import { DeleteStudentButton } from "@/components/students/delete-student-button";
import { GroupMembersCard } from "@/components/students/group-members-card";
import { ResyncLessonsButton } from "@/components/students/resync-lessons-button";
import { MonthlyReportButton } from "@/components/students/monthly-report-button";
import { ViewCredentialsButton } from "@/components/shared/view-credentials-button";
import { SetPasswordButton } from "@/components/shared/set-password-button";
import { AuditTrail } from "@/components/shared/audit-trail";
import { studentStatusLabel, studentStatusVariant, formatDate } from "@/lib/labels";
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
  charges = [],
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
  // This student's cobrança definitions (see StudentCharge) — same
  // gating as paymentHistory.
  charges?: StudentChargeRow[];
  // Lets "Aulas A Dar Esse Mês" be checked for a past month instead of
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
  // (isMakeup) are extra makeup slots, not part of the regular weekly
  // schedule, so they're excluded here.
  const refMonthDate = monthNav ? new Date(monthNav.year, monthNav.month, 1) : new Date();
  const monthStart = startOfMonth(refMonthDate);
  const monthEnd = endOfMonth(refMonthDate);
  const lessonsThisMonth = student.lessons.filter(
    (l) => l.scheduledAt >= monthStart && l.scheduledAt <= monthEnd
  );
  // A lesson counts as "realizada" once it's COMPLETED, NO_SHOW (NC),
  // CANCELED_LATE (CT) or CANCELED_BY_STUDENT_NO_MAKEUP (CASR) — same rule
  // as REALIZED_STATUSES in teachers.ts (a reposição only adds to this once
  // its own row flips to COMPLETED, which this already covers without
  // special-casing isMakeup).
  const REALIZED_LESSON_STATUSES: readonly string[] = [
    "COMPLETED",
    "NO_SHOW",
    "CANCELED_LATE",
    "CANCELED_BY_STUDENT_NO_MAKEUP",
  ];

  // Running total of contracted classes since billing started — governed by
  // the due date (vencimento), same billing-cycle convention as the
  // monthly report's own "aulas contratadas" (see dueDateFor/
  // resolveHistoricalAmount in the report route): a cycle runs from one due
  // date to the next (e.g. billing starting the 20th means cycle 1 runs
  // 20th-to-20th), not calendar-month boundaries. Each complete-or-current
  // cycle through whichever month the page-level MonthNav is browsing
  // (defaulting to the current month) contributes one lessonsPerMonth.
  // Honors lessonsPerMonthHistory/dueDayHistory if either ever changed
  // mid-course. Shown next to the tabs, outside any single TabsContent, so
  // it's visible no matter which tab is selected.
  // billingStartDate/startDate is only the fallback floor — an explicit
  // earlier "from" on lessonsPerMonthHistory/dueDayHistory (a deliberately
  // backdated record) is honored instead, same convention as billing.
  const billingStartFloor = student.billingStartDate ?? student.startDate;
  const billingStartEarliestFrom = earliestHistoryFrom(
    student.lessonsPerMonthHistory,
    student.dueDayHistory
  );
  const billingStart =
    billingStartEarliestFrom && billingStartEarliestFrom < billingStartFloor
      ? billingStartEarliestFrom
      : billingStartFloor;
  const cycleCutoff = endOfMonth(refMonthDate);
  let totalContractedLessons = 0;
  let cycleStart = billingStart;
  let cycleMonthCursor = new Date(billingStart.getFullYear(), billingStart.getMonth(), 1);
  while (cycleStart <= cycleCutoff) {
    const nextMonthCursor = new Date(cycleMonthCursor.getFullYear(), cycleMonthCursor.getMonth() + 1, 1);
    const nextDueDay = resolveHistoricalAmount(student.dueDay, student.dueDayHistory, nextMonthCursor);
    totalContractedLessons += resolveHistoricalAmount(
      student.lessonsPerMonth,
      student.lessonsPerMonthHistory,
      cycleMonthCursor,
      { zeroOnGap: true }
    );
    cycleStart = dueDateFor(nextMonthCursor, nextDueDay);
    cycleMonthCursor = nextMonthCursor;
  }

  // Top row: "Aulas A Dar Esse Mês" and "Aulas Realizadas Esse Mês" track
  // whichever month the MonthNav above is browsing; "Aulas realizadas"
  // (no month qualifier) is the student's all-time total instead.
  const contractedLessonsThisMonth = lessonsThisMonth.filter((l) => !l.isMakeup).length;
  const realizedLessonsThisMonth = lessonsThisMonth.filter((l) =>
    REALIZED_LESSON_STATUSES.includes(l.status)
  ).length;
  const realizedLessonsAllTime = student.lessons.filter((l) =>
    REALIZED_LESSON_STATUSES.includes(l.status)
  ).length;

  // The boxes below are all-time totals since the student's enrollment, not
  // scoped to the browsed month.
  // "Aulas dadas" is only the regular, non-makeup lessons the student
  // actually attended — reposições and no-shows are tracked in their own
  // boxes and shouldn't inflate this one.
  const completedLessons = student.lessons.filter(
    (l) => l.status === "COMPLETED" && !l.isMakeup
  ).length;
  const canceledByStudent = student.lessons.filter((l) => l.status === "CANCELED_BY_STUDENT").length;
  // CASR — student canceled with no reposição booked, so like CT it still
  // counts as a class given (teacher is paid for it — see REALIZED_STATUSES).
  const canceledByStudentNoMakeup = student.lessons.filter(
    (l) => l.status === "CANCELED_BY_STUDENT_NO_MAKEUP"
  ).length;
  const canceledByTeacher = student.lessons.filter((l) => l.status === "CANCELED_BY_TEACHER").length;
  // Two separate boxes — Reposição Dada (COMPLETED) and Reposição Não
  // Compareceu (NO_SHOW) — rather than one combined count, since the
  // teacher is paid either way but the outcome itself is worth telling
  // apart. A booked-but-unresolved reposição stays MAKEUP ("Reposição
  // Marcada") and isn't counted in either box yet. isMakeup (not
  // rescheduledFromId) is what identifies it as a reposição at all, since
  // one flagged directly via the status dropdown — not booked through the
  // Reagendamento picker — has no rescheduledFromId to key off once its
  // status has already moved on.
  // Each counts distinct cancellations made up, not distinct makeup lesson
  // rows — a single canceled class split across two reposição lessons
  // (e.g. two 45min sessions replacing one 90min class) still only repays
  // ONE cancellation, so it counts once here, grouped by rescheduledFromId.
  // A makeup flagged directly via the status dropdown (no rescheduledFromId)
  // has no cancellation to group under, so it counts on its own id instead.
  function countDistinctMakeups(status: "COMPLETED" | "NO_SHOW") {
    const matches = student.lessons.filter((l) => l.isMakeup && l.status === status);
    return new Set(matches.map((l) => l.rescheduledFromId ?? l.id)).size;
  }
  const makeupGivenCount = countDistinctMakeups("COMPLETED");
  const makeupNoShowCount = countDistinctMakeups("NO_SHOW");
  // Excludes makeups — a reposição marked "não compareceu" is tracked in
  // its own Reposição Não Compareceu box instead of inflating this one,
  // matching "Aula dada" excluding makeups from the completed count.
  const noShowCount = student.lessons.filter((l) => l.status === "NO_SHOW" && !l.isMakeup).length;
  // CT — canceled too late to fill the slot, so like NC it still counts as
  // a class given (teacher is paid for it — see REALIZED_STATUSES).
  const canceledLateCount = student.lessons.filter((l) => l.status === "CANCELED_LATE").length;
  const canceledVacationCount = student.lessons.filter((l) => l.status === "CANCELED_VACATION").length;
  // F — feriado. Like NC/CT, still counts as a class given for teacher
  // payroll purposes (see REALIZED_STATUSES) — the teacher isn't
  // penalized for a holiday nobody scheduled around.
  const canceledHolidayCount = student.lessons.filter((l) => l.status === "CANCELED_HOLIDAY").length;

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
              <h1 className="text-xl font-semibold">{student.groupName ?? student.user.name}</h1>
              <Badge variant={studentStatusVariant[student.status]}>
                {studentStatusLabel[student.status]}
              </Badge>
            </div>
            {student.groupName ? (
              <p className="text-sm text-muted-foreground">
                {[student.user, ...student.groupMembers.map((m) => m.user)]
                  .map((u) => `@${u.username}`)
                  .join(", ")}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">@{student.user.username}</p>
                {student.user.email && (
                  <p className="text-xs text-muted-foreground">{student.user.email}</p>
                )}
              </>
            )}
            <p className="text-sm text-muted-foreground">
              {student.course?.name ?? "Curso não definido"} · Prof.{" "}
              {student.teacher?.user.name ?? "não atribuído"}
            </p>
          </div>
        </div>
        {permissions.canEdit && (
          <div className="flex flex-1 items-center justify-center">
            <MonthlyReportButton
              studentId={student.id}
              year={refMonthDate.getFullYear()}
              month={refMonthDate.getMonth()}
            />
          </div>
        )}
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
                  groupName: student.groupName,
                  isGroup: student.groupMembers.length > 0,
                  groupMembers: student.groupMembers.map((m) => ({
                    userId: m.userId,
                    name: m.user.name,
                    username: m.user.username,
                    email: m.user.email,
                    phone: m.user.phone,
                  })),
                  email: student.user.email,
                  cpf: student.cpf,
                  phone: student.user.phone,
                  birthDate: student.birthDate?.toISOString().slice(0, 10),
                  address: student.address,
                  meetLink: student.meetLink,
                  teacherId: student.teacherId,
                  teacherHistory: parseTeacherHistory(student.teacherHistory),
                  teacherPayRate: Number(student.teacherPayRate),
                  teacherPayMode: student.teacherPayMode,
                  teacherMonthlyAmount: Number(student.teacherMonthlyAmount),
                  teacherPercentage: Number(student.teacherPercentage),
                  courseId: student.courseId,
                  courseHistory: parseSelectHistory(student.courseHistory),
                  planId: student.planId,
                  planHistory: parseSelectHistory(student.planHistory),
                  lessonsPerMonth: student.lessonsPerMonth,
                  lessonsPerMonthHistory: parseValueHistory(student.lessonsPerMonthHistory),
                  lessonSchedule: parseLessonSchedule(student.lessonSchedule),
                  level: student.level,
                  startDate: student.startDate.toISOString().slice(0, 10),
                  billingStartDate: student.billingStartDate?.toISOString().slice(0, 10),
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Aulas A Dar Esse Mês"
          value={String(contractedLessonsThisMonth)}
          icon={BookOpen}
        />
        <StatCard
          label="Aulas Realizadas Esse Mês"
          value={String(realizedLessonsThisMonth)}
          icon={GraduationCap}
          accent
        />
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                {permissions.showOverview !== false && (
                  <TabsTrigger value="overview">Visão geral</TabsTrigger>
                )}
                <TabsTrigger value="lessons">Histórico de aulas</TabsTrigger>
                {permissions.showFinancial && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
                {permissions.showAudit && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
              </TabsList>

              {/* Not tied to any one tab — stays visible across all of them. */}
              <div className="w-52">
                <StatCard
                  label="Total de aulas contratadas"
                  value={String(totalContractedLessons)}
                  icon={Layers}
                />
              </div>
            </div>

            {permissions.showOverview !== false && (
            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dados cadastrais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <InfoRow
                    label="Dias e horários das aulas"
                    value={formatLessonSchedule(parseLessonSchedule(student.lessonSchedule))}
                  />
                  <InfoRow label="Início do curso" value={formatDate(student.startDate)} />
                  <InfoRow
                    label="Início da cobrança"
                    value={
                      student.billingStartDate
                        ? formatDate(student.billingStartDate)
                        : formatDate(student.startDate)
                    }
                  />
                  <InfoRow
                    label="Professor atual"
                    value={formatCurrentTeacher(
                      student.teacher?.user.name ?? null,
                      parseTeacherHistory(student.teacherHistory),
                      student.teacherId,
                      student.startDate
                    )}
                  />
                  <InfoRow
                    label="Professor(es) no passado"
                    value={formatPastTeachers(
                      parseTeacherHistory(student.teacherHistory),
                      editOptions?.teachers ?? [],
                      student.teacherId
                    )}
                  />
                  <InfoRow label="Telefone" value={student.user.phone ?? "—"} />
                  <InfoRow label="Email" value={student.user.email ?? "—"} />
                  <InfoRow label="Link do Meet" value={student.meetLink ?? "—"} />
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
                canDelete={permissions.canDelete}
              />
            </TabsContent>

            {permissions.showFinancial && (
              <TabsContent value="financial" className="mt-4 space-y-4">
                <StudentChargesTable
                  studentId={student.id}
                  studentName={student.user.name}
                  charges={charges}
                  bankAccount={student.bankAccount}
                  editable={permissions.canEdit}
                />
                <StudentPaymentsTable
                  payments={paymentHistory}
                  studentId={student.id}
                  studentName={student.user.name}
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
          <div className="space-y-3">
            <StatCard label="Aulas Realizadas" value={String(realizedLessonsAllTime)} icon={Award} />
            <StatCard label="Aulas Dadas" value={String(completedLessons)} icon={CheckCircle2} accent />
            <StatCard label="Reposição Dada" value={String(makeupGivenCount)} icon={Repeat} />
            <StatCard
              label="Reposição Não Compareceu"
              value={String(makeupNoShowCount)}
              icon={UserX}
            />
            <StatCard label="Não Compareceu" value={String(noShowCount)} icon={UserX} />
            <StatCard label="Cancelamento Tarde" value={String(canceledLateCount)} icon={Clock3} />
            <StatCard label="Cancelamento Aluno" value={String(canceledByStudent)} icon={XCircle} />
            <StatCard
              label="Cancelamento Aluno (Sem Rep)"
              value={String(canceledByStudentNoMakeup)}
              icon={XCircle}
            />
            <StatCard label="Cancelamento Professor" value={String(canceledByTeacher)} icon={XCircle} />
            <StatCard label="Feriado" value={String(canceledHolidayCount)} icon={PartyPopper} />
            <StatCard label="Cancelamento Férias" value={String(canceledVacationCount)} icon={Palmtree} />
          </div>

          {permissions.canEdit && (
            <GroupMembersCard
              studentId={student.id}
              owner={{
                userId: student.userId,
                name: student.user.name,
                username: student.user.username,
              }}
              members={student.groupMembers.map((m) => ({
                id: m.id,
                userId: m.userId,
                name: m.user.name,
                username: m.user.username,
              }))}
              canManage={permissions.canEdit}
            />
          )}

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

function parseTeacherHistory(value: unknown): TeacherHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is Record<string, unknown> & { id: string } =>
        typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).id === "string"
    )
    .map((e) => ({
      id: e.id,
      from: typeof e.from === "string" && e.from ? e.from : undefined,
      until: typeof e.until === "string" && e.until ? e.until : undefined,
      rate: typeof e.rate === "number" ? e.rate : undefined,
      mode: e.mode === "MONTHLY" ? "MONTHLY" : e.mode === "PERCENTAGE" ? "PERCENTAGE" : undefined,
      monthlyAmount: typeof e.monthlyAmount === "number" ? e.monthlyAmount : undefined,
      percentage: typeof e.percentage === "number" ? e.percentage : undefined,
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

// The current teacher's own "desde" date: whichever teacherHistory entry
// is both this teacher's id and still open-ended (no until — a past stint
// with this same teacher, before a later swap and swap-back, shouldn't be
// mistaken for the current one) wins; with no such entry at all (the
// teacher's never changed, so nothing's ever been logged), falls back to
// the student's own startDate — they've had this teacher since day one.
function formatCurrentTeacher(
  name: string | null,
  history: TeacherHistoryEntry[],
  currentTeacherId: string | null,
  startDate: Date
) {
  if (!name) return "—";
  const current = history.find((e) => e.id === currentTeacherId && !e.until);
  const since = current?.from ? formatDate(current.from) : formatDate(startDate);
  return `${name} (desde ${since})`;
}

// Every teacherHistory entry whose id isn't the student's current teacher —
// each past assignment is real history (e.g. who taught before the current
// teacher took over), shown with whatever vigência it ran, name resolved
// against the full teachers list (editOptions, already fetched for the
// cadastro edit dialog) since a history entry only stores the teacherId.
function formatPastTeachers(
  history: TeacherHistoryEntry[],
  teachers: { id: string; label: string }[],
  currentTeacherId: string | null
) {
  const nameById = new Map(teachers.map((t) => [t.id, t.label]));
  const past = history.filter((e) => e.id !== currentTeacherId);
  if (past.length === 0) return "—";
  return past
    .map((e) => {
      const name = nameById.get(e.id) ?? "Professor removido";
      const range =
        e.from && e.until
          ? `${formatDate(e.from)} – ${formatDate(e.until)}`
          : e.until
            ? `até ${formatDate(e.until)}`
            : e.from
              ? `desde ${formatDate(e.from)}`
              : null;
      return range ? `${name} (${range})` : name;
    })
    .join(", ");
}

function isScheduleEntryCurrentlyActive(e: { from?: string; until?: string }, today: string): boolean {
  return (!e.from || e.from <= today) && (!e.until || e.until >= today);
}

// Vigência (from/until) is deliberately left out of this display — it's
// only ever meaningful while editing (the cadastro's own schedule editor
// already shows it there), and reads as clutter on the read-only overview.
// Only the entry(ies) in effect today are shown — a student's past
// schedules (already-ended vigência windows) shouldn't still appear
// alongside their current one here.
function formatLessonSchedule(schedule: ScheduleEntry[]) {
  const today = new Date().toISOString().slice(0, 10);
  const current = schedule.filter((e) => isScheduleEntryCurrentlyActive(e, today));
  if (current.length === 0) return "—";
  return current
    .map((e) => {
      const day = WEEKDAY_ABBR[e.weekday];
      const time = e.start ? (e.end ? `${e.start}–${e.end}` : e.start) : "";
      return time ? `${day} ${time}` : day;
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
