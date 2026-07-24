import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseFormDialog } from "@/components/catalog/course-form-dialog";
import { PlanFormDialog } from "@/components/catalog/plan-form-dialog";
import { DeleteCourseButton } from "@/components/catalog/delete-course-button";
import { PlanActiveSwitch } from "@/components/catalog/plan-active-switch";
import { listCoursesWithUsage, listPlansWithUsage } from "@/server/queries/catalog";
import { formatCurrency } from "@/lib/labels";

export default async function AdminCatalogPage() {
  const [courses, plans] = await Promise.all([listCoursesWithUsage(), listPlansWithUsage()]);

  return (
    <div>
      <PageHeader title="Cursos & Planos" description="Catálogo usado no cadastro de alunos." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Cursos</h2>
            <CourseFormDialog />
          </div>
          <div className="space-y-2">
            {courses.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-6">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.description && (
                      <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                    )}
                    <Badge variant="outline" className="mt-1.5">
                      {c._count.students} aluno{c._count.students === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <CourseFormDialog course={c} />
                    <DeleteCourseButton courseId={c.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
            {courses.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum curso cadastrado ainda.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Planos</h2>
            <PlanFormDialog />
          </div>
          <div className="space-y-2">
            {plans.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-6">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(p.price.toString())} · {p.lessonsPerMonth} aulas/mês
                    </p>
                    <Badge variant="outline" className="mt-1.5">
                      {p._count.students} aluno{p._count.students === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PlanActiveSwitch planId={p.id} active={p.active} />
                    <PlanFormDialog
                      plan={{
                        id: p.id,
                        name: p.name,
                        price: Number(p.price),
                        lessonsPerMonth: p.lessonsPerMonth,
                        description: p.description,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {plans.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum plano cadastrado ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
