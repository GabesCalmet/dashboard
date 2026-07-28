"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeCredentialsPassword } from "@/server/actions/users";

export function SetPasswordButton({
  userId,
  size = "sm",
}: {
  userId: string;
  size?: "sm" | "default" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await changeCredentialsPassword(userId, password);
        toast.success("Senha atualizada com sucesso.");
        setOpen(false);
        setPassword("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao alterar senha.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size}>
          <KeyRound /> {size !== "icon" && "Alterar senha"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            Escolha a nova senha desta pessoa. A senha anterior deixa de funcionar
            imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <DialogFooter>
          <Button disabled={isPending || password.length < 6} onClick={submit}>
            {isPending && <Loader2 className="animate-spin" />}
            Salvar nova senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
