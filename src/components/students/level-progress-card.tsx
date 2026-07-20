"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { levelLabel } from "@/lib/labels";
import { promoteStudentLevel, updateLevelProgress } from "@/server/actions/students";
import type { CourseLevel } from "@prisma/client";

export function LevelProgressCard({
  studentId,
  level,
  progress,
  canManage,
  canPromote,
}: {
  studentId: string;
  level: CourseLevel;
  progress: number;
  canManage: boolean;
  canPromote: boolean;
}) {
  const [value, setValue] = useState(progress);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nível atual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold">{level}</span>
          <span className="text-sm text-muted-foreground">{value}% concluído</span>
        </div>
        <Progress value={value} indicatorClassName="bg-accent" />
        <p className="text-xs text-muted-foreground">{levelLabel[level]}</p>

        {canManage && (
          <div className="space-y-2 pt-2">
            <Slider
              value={[value]}
              max={100}
              step={5}
              onValueChange={(v) => setValue(v[0])}
              onValueCommit={(v) =>
                startTransition(() => updateLevelProgress(studentId, v[0]))
              }
            />
          </div>
        )}

        {canPromote && value >= 100 && (
          <Button
            className="w-full"
            variant="accent"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await promoteStudentLevel(studentId);
                  toast.success("Aluno promovido para o próximo nível!");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao promover.");
                }
              })
            }
          >
            {isPending ? <Loader2 className="animate-spin" /> : <ArrowUpCircle />}
            Promover para o próximo nível
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
