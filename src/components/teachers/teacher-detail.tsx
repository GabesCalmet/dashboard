import Link from "next/link";
import { ArrowLeft, CalendarCheck2, GraduationCap, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { TeacherFormDialog } from "@/components/teachers/teacher-form-dialog";
import { DeleteTeacherButton } from "@/components/teachers/delete-teacher-button";
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
            <p className="text-sm text-muted-foreground">{teacher.user.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {teacher.specialties.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <TeacherFormDialog
              teacher={{
                id: teacher.id,
                name: teacher.user.name,
                phone: teacher.user.phone,
                specialties: teacher.specialties,
                hourlyRate: Number(teacher.hourlyRate),
                weeklyHours: teacher.weeklyHours,
                admissionDate: teacher.admissionDate.toISOString().slice(0, 10),
                notes: teacher.notes,
              }}
            />
            <DeleteTeacherButton teacherId={teacher.id} redirectTo={basePath} />
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Alunos" value={String(teacher.students.length)} icon={Users} />
        <StatCard label="Aulas hoje" value={String(teacher.todayLessons)} icon={CalendarCheck2} accent />
        <StatCard label="Aulas realizadas (total)" value={String(teacher.completedTotal)} icon={GraduationCap} />
        <StatCard label="Valor/hora" value={formatCurrency(teacher.hourlyRate.toString())} icon={GraduationCap} />
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
            <Row label="Carga horária" value={`${teacher.weeklyHours}h/mês`} />
            <Row label="Admissão" value={formatDate(teacher.admissionDate)} />
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
