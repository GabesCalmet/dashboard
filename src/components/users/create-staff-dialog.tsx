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

export function CreateStaffDialog() {
  const [state, formAction, isPending] = useActionState(createStaffUser, undefined);
  const [open, setOpen] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
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
  );
}
