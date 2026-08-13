import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth";
import { getStudentProgressData } from "@/server/queries/student-progress";
import { levelLabel, levelOrder } from "@/lib/labels";

export default async function StudentProgressPage() {
  const user = await requireRole("STUDENT");
  const { student } = await getStudentProgressData(user.studentProfile!.id);

  return (
    <div>
      <PageHeader title="Meu Progresso" description="Acompanhe sua evolução no curso de inglês." />

      <Card>
        <CardHeader>
          <CardTitle>Nível atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center gap-3">
            {levelOrder.map((lvl) => (
              <span
                key={lvl}
                className={
                  lvl === student.level
                    ? "rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                    : "rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                }
              >
                {lvl}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Progress value={student.levelProgress} className="h-2.5 flex-1" />
            <span className="text-sm font-medium">{student.levelProgress}%</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{levelLabel[student.level]}</p>
        </CardContent>
      </Card>
    </div>
  );
}
