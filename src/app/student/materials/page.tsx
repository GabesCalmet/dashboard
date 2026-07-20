import { FileText, Headphones, Video } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const iconByType: Record<string, typeof FileText> = {
  pdf: FileText,
  video: Video,
  audio: Headphones,
};

export default async function StudentMaterialsPage() {
  const user = await requireRole("STUDENT");
  const materials = await prisma.material.findMany({
    where: {
      OR: [{ level: user.studentProfile?.level }, { courseId: user.studentProfile?.courseId }],
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Materiais"
        description="Biblioteca de materiais didáticos do seu nível e curso."
      />

      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum material disponível ainda. Seu professor ou a coordenação irá
            disponibilizar PDFs, vídeos e áudios aqui em breve.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => {
            const Icon = iconByType[m.type] ?? FileText;
            return (
              <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                <Card className="transition-colors hover:border-accent/50">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <Icon className="size-4.5" />
                    </div>
                    <p className="font-medium">{m.title}</p>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
