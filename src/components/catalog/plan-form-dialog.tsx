"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPlan, updatePlan } from "@/server/actions/catalog";
import { useActionToast } from "@/hooks/use-action-toast";

type PlanDefaults = {
  id: string;
  name: string;
  price: number;
  lessonsPerMonth: number;
  description?: string | null;
};

export function PlanFormDialog({ plan }: { plan?: PlanDefaults }) {
  const isEdit = Boolean(plan);
  const action = isEdit ? updatePlan.bind(null, plan!.id) : createPlan;
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={isEdit ? "sm" : "default"} variant={isEdit ? "outline" : "default"}>
          {isEdit ? <Pencil /> : <Plus />}
          {isEdit ? "Editar" : "Novo plano"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar plano" : "Cadastrar plano"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome do plano</Label>
            <Input id="name" name="name" defaultValue={plan?.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Valor (R$)</Label>
            <Input id="price" name="price" type="number" step="0.01" defaultValue={plan?.price} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lessonsPerMonth">Aulas por mês</Label>
            <Input
              id="lessonsPerMonth"
              name="lessonsPerMonth"
              type="number"
              defaultValue={plan?.lessonsPerMonth ?? 4}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" defaultValue={plan?.description ?? ""} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Salvar alterações" : "Cadastrar plano"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
