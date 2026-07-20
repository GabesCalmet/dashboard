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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStudent, updateStudent } from "@/server/actions/students";
import { useActionToast } from "@/hooks/use-action-toast";
import { levelLabel } from "@/lib/labels";
import type { CourseLevel, StudentStatus } from "@prisma/client";

type Option = { id: string; label: string };

type StudentDefaults = {
  id: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  birthDate?: string;
  address?: string | null;
  teacherId?: string | null;
  courseId?: string | null;
  planId?: string | null;
  monthlyValue: number;
  lessonsPerMonth: number;
  lessonWeekday?: number | null;
  lessonTime?: string | null;
  level: CourseLevel;
  startDate?: string;
  objective?: string | null;
  notes?: string | null;
  status: StudentStatus;
};

const weekdays = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function StudentFormDialog({
  teachers,
  courses,
  plans,
  student,
}: {
  teachers: Option[];
  courses: Option[];
  plans: Option[];
  student?: StudentDefaults;
}) {
  const isEdit = Boolean(student);
  const action = isEdit ? updateStudent.bind(null, student!.id) : createStudent;
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={isEdit ? "sm" : "default"} variant={isEdit ? "outline" : "default"}>
          {isEdit ? <Pencil /> : <Plus />}
          {isEdit ? "Editar" : "Novo aluno"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar aluno" : "Cadastrar aluno"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do aluno."
              : "Um login será criado automaticamente para o aluno acessar o portal."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" name="name" defaultValue={student?.name} required />
          </div>

          {!isEdit && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" name="cpf" defaultValue={student?.cpf ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={student?.phone ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input id="birthDate" name="birthDate" type="date" defaultValue={student?.birthDate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Data de início</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={student?.startDate} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={student?.address ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label>Professor</Label>
            <Select name="teacherId" defaultValue={student?.teacherId ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Curso</Label>
            <Select name="courseId" defaultValue={student?.courseId ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Plano</Label>
            <Select name="planId" defaultValue={student?.planId ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthlyValue">Valor mensal (R$)</Label>
            <Input
              id="monthlyValue"
              name="monthlyValue"
              type="number"
              step="0.01"
              defaultValue={student?.monthlyValue}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lessonsPerMonth">Aulas por mês</Label>
            <Input
              id="lessonsPerMonth"
              name="lessonsPerMonth"
              type="number"
              defaultValue={student?.lessonsPerMonth ?? 4}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Dia da aula</Label>
            <Select
              name="lessonWeekday"
              defaultValue={student?.lessonWeekday?.toString() ?? undefined}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {weekdays.map((w, i) => (
                  <SelectItem key={w} value={String(i)}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lessonTime">Horário</Label>
            <Input
              id="lessonTime"
              name="lessonTime"
              type="time"
              defaultValue={student?.lessonTime ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nível</Label>
            <Select name="level" defaultValue={student?.level ?? "A1"} required>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(levelLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select name="status" defaultValue={student?.status ?? "ACTIVE"}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="PAUSED">Pausado</SelectItem>
                <SelectItem value="CANCELED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="objective">Objetivo</Label>
            <Input id="objective" name="objective" defaultValue={student?.objective ?? ""} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={student?.notes ?? ""} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Salvar alterações" : "Cadastrar aluno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
