"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStaffUser } from "@/server/actions/users";
import { useActionToast } from "@/hooks/use-action-toast";
import { TempPasswordDialog } from "@/components/shared/temp-password-dialog";

export function CreateStaffDialog() {
  const [state, formAction, isPending] = useActionState(createStaffUser, undefined);
  const [open, setOpen] = useState(false);
  const [loginType, setLoginType] = useState<"email" | "username">("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  useActionToast(
    state,
    () => setOpen(false),
    (password) => setNewPassword(password)
  );

  function handleOpenChange(next: boolean) {
    if (next) {
      setLoginType("email");
      setEmail("");
      setUsername("");
    }
    setOpen(next);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar usuário administrativo</DialogTitle>
          <DialogDescription>
            Para cadastrar alunos ou professores, use as páginas de Alunos e
            Professores. Aqui você cria acessos de Administrador ou Coordenador.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de login</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={loginType === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setLoginType("email")}
              >
                Email
              </Button>
              <Button
                type="button"
                variant={loginType === "username" ? "default" : "outline"}
                size="sm"
                onClick={() => setLoginType("username")}
              >
                Nome de usuário
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {loginType === "email"
                ? "Login real por email, com senha temporária gerada automaticamente."
                : "Login por nome de usuário e senha escolhidos aqui, igual a alunos/professores — sem email associado."}
            </p>
          </div>

          <input type="hidden" name="loginType" value={loginType} />

          {loginType === "email" ? (
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Nome de usuário</Label>
                <Input
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: gabes"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="text" placeholder="Mínimo 6 caracteres" required />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-1.5">
            <Label>Nível de acesso</Label>
            <Select name="role" defaultValue="COORDINATOR" required>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COORDINATOR">Coordenador</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <TempPasswordDialog
      open={newPassword !== null}
      onOpenChange={(o) => !o && setNewPassword(null)}
      login={email}
      password={newPassword ?? ""}
    />
    </>
  );
}
