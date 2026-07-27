"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
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
import { TempPasswordDialog } from "@/components/shared/temp-password-dialog";
import { resetUserPassword } from "@/server/actions/users";

export function ResetPasswordButton({
  userId,
  size = "sm",
}: {
  userId: string;
  size?: "sm" | "default" | "icon";
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size={size}>
            <KeyRound /> {size !== "icon" && "Redefinir senha"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir senha</AlertDialogTitle>
            <AlertDialogDescription>
              Isso gera uma nova senha e invalida a anterior imediatamente. A
              pessoa precisará usar a nova senha no próximo login.
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
                    const res = await resetUserPassword(userId);
                    setResult(res);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha.");
                  }
                });
              }}
            >
              {isPending && <Loader2 className="animate-spin" />}
              Gerar nova senha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {result && (
        <TempPasswordDialog
          open={Boolean(result)}
          onOpenChange={(o) => !o && setResult(null)}
          email={result.email}
          password={result.password}
        />
      )}
    </>
  );
}
