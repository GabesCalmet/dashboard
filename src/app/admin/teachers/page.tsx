import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { TeacherFormDialog } from "@/components/teachers/teacher-form-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { listTeachers } from "@/server/queries/teachers";

export default async function AdminTeachersPage() {
  const teachers = await listTeachers();

  return (
    <div>
      <PageHeader
        title="Professores"
        description={`${teachers.length} professores cadastrados`}
        actions={<TeacherFormDialog />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map((t) => (
          <Link key={t.id} href={`/admin/teachers/${t.id}`}>
            <Card className="transition-colors hover:border-accent/50">
              <CardContent className="flex items-start gap-3 pt-1">
                <Avatar className="size-11">
                  {t.user.avatarUrl && <AvatarImage src={t.user.avatarUrl} />}
                  <AvatarFallback>{t.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.specialties.slice(0, 3).map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span>{t.activeStudents} alunos ativos</span>
                    <span>{t.lessonsThisMonth} aulas/mês</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {teachers.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            Nenhum professor cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
