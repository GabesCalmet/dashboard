"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteTeacher } from "@/server/actions/teachers";

export function DeleteTeacherButton({ teacherId, redirectTo }: { teacherId: string; redirectTo: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 /> Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir professor</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove o acesso do professor ao portal. Os alunos vinculados
            ficarão sem professor responsável até uma nova atribuição.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  await deleteTeacher(teacherId);
                  toast.success("Professor excluído.");
                  router.push(redirectTo);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
                }
              });
            }}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Confirmar exclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
