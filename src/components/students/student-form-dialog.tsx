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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStudent, updateStudent } from "@/server/actions/students";
import { useActionToast } from "@/hooks/use-action-toast";
import { LessonScheduleEditor, type ScheduleEntry } from "@/components/students/lesson-schedule-editor";
import { levelLabel, bankAccountLabel } from "@/lib/labels";
import type { CourseLevel, StudentStatus, BankAccount } from "@prisma/client";

type Option = { id: string; label: string };

type StudentDefaults = {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  cpf?: string | null;
  phone?: string | null;
  birthDate?: string;
  address?: string | null;
  teacherId?: string | null;
  courseId?: string | null;
  planId?: string | null;
  monthlyValue: number;
  bankAccount?: BankAccount;
  dueDay?: number;
  thirdPartyPayerName?: string | null;
  thirdPartyAmount?: number | null;
  thirdPartyDueDay?: number | null;
  thirdPartyBankAccount?: BankAccount | null;
  lessonsPerMonth: number;
  lessonSchedule?: ScheduleEntry[];
  level: CourseLevel;
  startDate?: string;
  objective?: string | null;
  notes?: string | null;
  status: StudentStatus;
};

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
  const [hasThirdParty, setHasThirdParty] = useState(Boolean(student?.thirdPartyAmount));
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
              : "Defina o login e a senha que o aluno vai usar para acessar o portal."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" name="name" defaultValue={student?.name} required />
          </div>

          {isEdit ? (
            <div className="space-y-1.5">
              <Label>Nome de usuário (login)</Label>
              <Input value={student?.username ?? ""} disabled readOnly />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="username">Nome de usuário (login)</Label>
                <Input id="username" name="username" placeholder="ex: joao.silva" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="text" placeholder="Mínimo 6 caracteres" required />
              </div>
            </>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Email de contato (opcional)</Label>
            <Input id="email" name="email" type="email" defaultValue={student?.email ?? ""} />
          </div>

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

          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={hasThirdParty}
                onCheckedChange={(checked) => setHasThirdParty(checked === true)}
              />
              Parte ou todo o valor é pago por terceiros (empresa)
            </label>
          </div>

          {hasThirdParty && (
            <>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="thirdPartyPayerName">Nome do terceiro (empresa)</Label>
                <Input
                  id="thirdPartyPayerName"
                  name="thirdPartyPayerName"
                  defaultValue={student?.thirdPartyPayerName ?? ""}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="thirdPartyAmount">Valor pago pelo terceiro (R$)</Label>
                <Input
                  id="thirdPartyAmount"
                  name="thirdPartyAmount"
                  type="number"
                  step="0.01"
                  defaultValue={student?.thirdPartyAmount ?? ""}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="thirdPartyDueDay">Dia de vencimento (terceiro)</Label>
                <Input
                  id="thirdPartyDueDay"
                  name="thirdPartyDueDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={student?.thirdPartyDueDay ?? ""}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Conta bancária (terceiro)</Label>
                <Select
                  name="thirdPartyBankAccount"
                  defaultValue={student?.thirdPartyBankAccount ?? "JOE"}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(bankAccountLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            <Select name="bankAccount" defaultValue={student?.bankAccount ?? "JOE"} required>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(bankAccountLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDay">Dia de vencimento do boleto</Label>
            <Input
              id="dueDay"
              name="dueDay"
              type="number"
              min={1}
              max={31}
              defaultValue={student?.dueDay ?? 10}
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

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Dia(s) e horário(s) da(s) aula(s)</Label>
            <LessonScheduleEditor name="lessonSchedule" defaultValue={student?.lessonSchedule ?? []} />
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
