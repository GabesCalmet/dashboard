"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
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
import { createTeacher, updateTeacher } from "@/server/actions/teachers";
import { useActionToast } from "@/hooks/use-action-toast";
import { TempPasswordDialog } from "@/components/shared/temp-password-dialog";

type TeacherDefaults = {
  id: string;
  name: string;
  phone?: string | null;
  specialties: string[];
  hourlyRate: number;
  weeklyHours: number;
  admissionDate?: string;
  notes?: string | null;
};

export function TeacherFormDialog({ teacher }: { teacher?: TeacherDefaults }) {
  const isEdit = Boolean(teacher);
  const action = isEdit ? updateTeacher.bind(null, teacher!.id) : createTeacher;
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  useActionToast(state, () => setOpen(false), (password) => setNewPassword(password));

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={isEdit ? "sm" : "default"} variant={isEdit ? "outline" : "default"}>
          {isEdit ? <Pencil /> : <Plus />}
          {isEdit ? "Editar" : "Novo professor"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar professor" : "Cadastrar professor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do professor."
              : "Um login será criado automaticamente para o professor acessar o portal."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" name="name" defaultValue={teacher?.name} required />
          </div>

          {!isEdit && (
            <div className="space-y-1.5 sm:col-span-2">
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
          )}

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={teacher?.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admissionDate">Data de admissão</Label>
            <Input id="admissionDate" name="admissionDate" type="date" defaultValue={teacher?.admissionDate} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hourlyRate">Valor por hora (R$)</Label>
            <Input
              id="hourlyRate"
              name="hourlyRate"
              type="number"
              step="0.01"
              defaultValue={teacher?.hourlyRate}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weeklyHours">Carga horária mensal</Label>
            <Input id="weeklyHours" name="weeklyHours" type="number" defaultValue={teacher?.weeklyHours} required />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="specialties">Especialidades (separadas por vírgula)</Label>
            <Input
              id="specialties"
              name="specialties"
              placeholder="Business English, Conversação, TOEFL"
              defaultValue={teacher?.specialties?.join(", ")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={teacher?.notes ?? ""} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Salvar alterações" : "Cadastrar professor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <TempPasswordDialog
      open={newPassword !== null}
      onOpenChange={(o) => !o && setNewPassword(null)}
      email={email}
      password={newPassword ?? ""}
    />
    </>
  );
}
