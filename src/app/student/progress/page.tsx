import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth";
import { getStudentProgressData } from "@/server/queries/student-progress";
import { levelLabel, levelOrder } from "@/lib/labels";

export default async function StudentProgressPage() {
  const user = await requireRole("STUDENT");
  const { student, skills, lessonsWithData } = await getStudentProgressData(user.studentProfile!.id);

  const skillEntries: { label: string; value: number | null }[] = [
    { label: "Vocabulary", value: skills.vocabulary },
    { label: "Grammar", value: skills.grammar },
    { label: "Listening", value: skills.listening },
    { label: "Speaking", value: skills.speaking },
    { label: "Writing", value: null },
    { label: "Reading", value: null },
  ];

  return (
    <div>
      <PageHeader title="Meu Progresso" description="Acompanhe sua evolução no curso de inglês." />

      <Card className="mb-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Habilidades trabalhadas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {skillEntries.map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">
                  {s.value === null ? "Em breve" : `${s.value}%`}
                </span>
              </div>
              <Progress value={s.value ?? 0} indicatorClassName={s.value === null ? "bg-muted-foreground/30" : undefined} />
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Calculado a partir de {lessonsWithData} aulas realizadas com relatório preenchido pelo professor.
      </p>
    </div>
  );
}
