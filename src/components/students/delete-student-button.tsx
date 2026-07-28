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
import { deleteStudent } from "@/server/actions/students";

export function DeleteStudentButton({ studentId, redirectTo }: { studentId: string; redirectTo: string }) {
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
          <AlertDialogTitle>Excluir aluno</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é permanente: o cadastro, o login e todo o histórico de
            aulas e pagamentos deste aluno serão apagados e não podem ser
            recuperados.
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
                  await deleteStudent(studentId);
                  toast.success("Aluno excluído.");
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
