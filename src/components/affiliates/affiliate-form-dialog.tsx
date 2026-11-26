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
import { Textarea } from "@/components/ui/textarea";
import { createAffiliate } from "@/server/actions/affiliates";
import { useActionToast } from "@/hooks/use-action-toast";

export function AffiliateFormDialog() {
  const [state, formAction, isPending] = useActionState(createAffiliate, undefined);
  const [open, setOpen] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Adicionar novo afiliado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar afiliado</DialogTitle>
          <DialogDescription>
            Defina o login e a senha que o afiliado vai usar para acessar o portal.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" name="name" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Nome de usuário (login)</Label>
            <Input id="username" name="username" placeholder="ex: maria.souza" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="text" placeholder="Mínimo 6 caracteres" required />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Email de contato (opcional)</Label>
            <Input id="email" name="email" type="email" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="commissionPercent">Comissão (% sobre a mensalidade do aluno indicado)</Label>
            <Input
              id="commissionPercent"
              name="commissionPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="Ainda não definido? Deixe em branco."
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Cadastrar afiliado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
