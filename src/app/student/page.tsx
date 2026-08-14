import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getStudentDashboardData } from "@/server/queries/student-dashboard";
import { formatDateTime, levelLabel } from "@/lib/labels";

export default async function StudentDashboardPage() {
  const user = await requireRole("STUDENT");
  const data = await getStudentDashboardData(user.studentProfile!.id);

  return (
    <div>
      <PageHeader title={`Olá, ${user.name.split(" ")[0]}`} description="Seu painel de estudos." />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Avatar className="size-16">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
            <AvatarFallback className="text-lg">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              {data.student.course?.name ?? "Curso não definido"} · Prof.{" "}
              {data.student.teacher?.user.name ?? "não atribuído"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium">{data.student.level}</span>
              <Progress value={data.student.levelProgress} className="h-1.5 max-w-40" />
              <span className="text-xs text-muted-foreground">{data.student.levelProgress}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Próxima aula"
          value={data.nextLesson ? formatDateTime(data.nextLesson.scheduledAt) : "—"}
          icon={CalendarClock}
          accent
        />
        <StatCard label="Aulas restantes (mês)" value={String(data.remainingThisMonth)} icon={BookOpen} />
        <StatCard label="Aulas realizadas (total)" value={String(data.completedTotal)} icon={CheckCircle2} />
        <StatCard label="Aulas no mês" value={String(data.completedThisMonth)} icon={GraduationCap} />
      </div>

      {data.nextLesson && data.student.meetLink && (
        <Button asChild className="mt-4">
          <a href={data.student.meetLink} target="_blank" rel="noopener noreferrer">
            <Video /> Entrar na próxima aula
          </a>
        </Button>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Histórico recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentLessons.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-md px-2 py-2 text-sm">
                <span>{formatDateTime(l.scheduledAt)}</span>
                <span className="text-xs text-muted-foreground">{l.teacher.user.name}</span>
              </div>
            ))}
            {data.recentLessons.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma aula registrada ainda.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardList className="size-4" /> Homework pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {data.pendingHomework || "Nenhum homework pendente no momento."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Últimas observações do professor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {data.lastObservation || "Nenhuma observação registrada ainda."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        <Link href="/student/progress" className="underline">
          Ver progresso completo — {levelLabel[data.student.level]}
        </Link>
      </p>
    </div>
  );
}
