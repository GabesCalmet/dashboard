import { BookOpen, CalendarClock, CheckCircle2, GraduationCap, Video } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getStudentDashboardData } from "@/server/queries/student-dashboard";
import { formatDateTime } from "@/lib/labels";
import { splitStudentIdSuffix } from "@/lib/student-number";
import { stripTeacherWord } from "@/lib/teacher-order";

export default async function StudentDashboardPage() {
  const user = await requireRole("STUDENT");
  const data = await getStudentDashboardData(user.studentProfile!.id);
  const { displayName, idSuffix } = splitStudentIdSuffix(user.name);

  return (
    <div>
      <PageHeader title={`Olá, ${displayName.split(" ")[0]}`} description="Seu painel de estudos." />

      <Card className="mb-6 w-fit">
        <CardContent className="flex flex-wrap items-center gap-4 py-6">
          <Avatar className="size-16">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
            <AvatarFallback className="text-lg">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-lg font-semibold">{displayName}</p>
            {idSuffix && <p className="text-xs text-muted-foreground">ID: {idSuffix}</p>}
            <p className="text-sm text-muted-foreground">
              Teacher{" "}
              {data.student.teacher ? stripTeacherWord(data.student.teacher.user.name) : "não atribuído"}
            </p>
          </div>
        </CardContent>
      </Card>

      {data.nextLesson && data.nextLessonMeetLink && (
        <Button asChild className="mb-4">
          <a href={data.nextLessonMeetLink} target="_blank" rel="noopener noreferrer">
            <Video /> Entrar na próxima aula
          </a>
        </Button>
      )}

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

      <Card className="mt-6">
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
    </div>
  );
}
