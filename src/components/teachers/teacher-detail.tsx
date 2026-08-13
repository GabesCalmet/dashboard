import Link from "next/link";
import { ArrowLeft, CalendarCheck2, GraduationCap, Users, XCircle, Repeat, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { TeacherFormDialog } from "@/components/teachers/teacher-form-dialog";
import type { ValueHistoryEntry } from "@/components/students/monthly-value-history-editor";
import { DeleteTeacherButton } from "@/components/teachers/delete-teacher-button";
import { ViewCredentialsButton } from "@/components/shared/view-credentials-button";
import { SetPasswordButton } from "@/components/shared/set-password-button";
import { TeacherActiveSwitch } from "@/components/teachers/teacher-active-switch";
import { studentStatusLabel, studentStatusVariant, formatCurrency, formatDate } from "@/lib/labels";
import type { getTeacherDetail } from "@/server/queries/teachers";

type Teacher = NonNullable<Awaited<ReturnType<typeof getTeacherDetail>>>;

export function TeacherDetailView({
  teacher,
  basePath,
  studentsBasePath,
  canManage,
}: {
  teacher: Teacher;
  basePath: string;
  studentsBasePath: string;
  canManage: boolean;
}) {
  return (
    <div>
      <Link
        href={basePath}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para professores
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {teacher.user.avatarUrl && <AvatarImage src={teacher.user.avatarUrl} />}
            <AvatarFallback className="text-lg">
              {teacher.user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{teacher.user.name}</h1>
            <p className="text-sm text-muted-foreground">@{teacher.user.username}</p>
            {teacher.user.email && (
              <p className="text-xs text-muted-foreground">{teacher.user.email}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {teacher.specialties.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManage && <TeacherActiveSwitch userId={teacher.userId} active={teacher.user.active} />}
          {canManage && (
            <>
              <TeacherFormDialog
                teacher={{
                  id: teacher.id,
                  name: teacher.user.name,
                  username: teacher.user.username,
                  email: teacher.user.email,
                  phone: teacher.user.phone,
                  specialties: teacher.specialties,
                  hourlyRate: Number(teacher.hourlyRate),
                  hourlyRateHistory: parseValueHistory(teacher.hourlyRateHistory),
                  admissionDate: teacher.admissionDate.toISOString().slice(0, 10),
                  endDate: teacher.endDate?.toISOString().slice(0, 10),
                  notes: teacher.notes,
                }}
              />
              <DeleteTeacherButton teacherId={teacher.id} redirectTo={basePath} />
            </>
          )}
          <ViewCredentialsButton userId={teacher.userId} />
          {canManage && <SetPasswordButton userId={teacher.userId} />}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Alunos" value={String(teacher.students.length)} icon={Users} />
        <StatCard
          label="Aulas esperadas (mês)"
          value={String(teacher.expectedLessonsThisMonth)}
          icon={CalendarCheck2}
        />
        <StatCard
          label="Aulas realizadas (mês)"
          value={String(teacher.actualLessonsThisMonth)}
          icon={GraduationCap}
          accent
        />
        <StatCard label="Valor/hora" value={formatCurrency(teacher.hourlyRate.toString())} icon={GraduationCap} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CA — Cancelamento aluno (mês)"
          value={String(teacher.canceledByStudentThisMonth)}
          icon={XCircle}
        />
        <StatCard
          label="CP — Cancelamento professor (mês)"
          value={String(teacher.canceledByTeacherThisMonth)}
          icon={XCircle}
        />
        <StatCard label="R — Reposições (mês)" value={String(teacher.makeupThisMonth)} icon={Repeat} />
        <StatCard
          label="Horas trabalhadas (mês)"
          value={`${teacher.hoursTaughtThisMonth.toFixed(1)}h`}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alunos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {teacher.students.map((s) => (
              <Link
                key={s.id}
                href={`${studentsBasePath}/${s.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-secondary"
              >
                <span>{s.user.name}</span>
                <Badge variant={studentStatusVariant[s.status]}>{studentStatusLabel[s.status]}</Badge>
              </Link>
            ))}
            {teacher.students.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum aluno atribuído ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados profissionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Admissão" value={formatDate(teacher.admissionDate)} />
            <Row label="Término" value={teacher.endDate ? formatDate(teacher.endDate) : "—"} />
            <Row label="Observações" value={teacher.notes || "—"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
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
