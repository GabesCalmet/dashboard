"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TempPasswordDialog } from "@/components/shared/temp-password-dialog";
import { revealCredentials } from "@/server/actions/users";

export function ViewCredentialsButton({
  userId,
  size = "sm",
}: {
  userId: string;
  size?: "sm" | "default" | "icon";
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ login: string; password: string } | null>(null);

  return (
    <>
      <Button
        variant="outline"
        size={size}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              const res = await revealCredentials(userId);
              setResult(res);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erro ao carregar credenciais.");
            }
          })
        }
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Eye />}
        {size !== "icon" && "Ver senha"}
      </Button>

      {result && (
        <TempPasswordDialog
          open={Boolean(result)}
          onOpenChange={(o) => !o && setResult(null)}
          login={result.login}
          password={result.password}
          title="Credenciais de acesso"
          description="Estas credenciais são visíveis apenas na sua conta de administrador/coordenação."
          loginLabel="Nome de usuário"
          passwordLabel="Senha atual"
        />
      )}
    </>
  );
}
