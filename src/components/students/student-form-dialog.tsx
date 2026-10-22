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
import { DateInput } from "@/components/ui/date-input";
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
import {
  SelectHistoryEditor,
  type SelectHistoryEntry,
} from "@/components/students/select-history-editor";
import { GroupMembersEditor } from "@/components/students/group-members-editor";
import {
  GroupMemberFieldsEditor,
  type GroupMemberFields,
} from "@/components/students/group-member-fields-editor";
import { levelLabel } from "@/lib/labels";
import type { CourseLevel, StudentStatus } from "@prisma/client";

type Option = { id: string; label: string };

type StudentDefaults = {
  id: string;
  name: string;
  username?: string | null;
  // Set only for an existing "grupo" cadastro — lets the edit dialog show
  // (and let the admin rename) the group's own name.
  groupName?: string | null;
  isGroup?: boolean;
  groupMembers?: GroupMemberFields[];
  email?: string | null;
  cpf?: string | null;
  phone?: string | null;
  birthDate?: string;
  address?: string | null;
  courseId?: string | null;
  courseHistory?: SelectHistoryEntry[];
  planId?: string | null;
  planHistory?: SelectHistoryEntry[];
  level: CourseLevel;
  endDate?: string;
  objective?: string | null;
  notes?: string | null;
  status: StudentStatus;
};

export function StudentFormDialog({
  courses,
  plans,
  student,
}: {
  courses: Option[];
  plans: Option[];
  student?: StudentDefaults;
}) {
  const isEdit = Boolean(student);
  const action = isEdit ? updateStudent.bind(null, student!.id) : createStudent;
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const [studentType, setStudentType] = useState<"individual" | "grupo">(
    student?.isGroup ? "grupo" : "individual"
  );
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
          {!(isEdit && student?.isGroup) && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tipo de cadastro</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={studentType === "individual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStudentType("individual")}
                >
                  Individual
                </Button>
                <Button
                  type="button"
                  variant={studentType === "grupo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStudentType("grupo")}
                >
                  Grupo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Mude para "Grupo" para transformar este aluno num grupo — ex: quando ele convida um amigo para ter aula junto. As aulas e o financeiro continuam ligados a este mesmo cadastro, mas cada participante tem seu próprio login.'
                  : "Nome/usuário/senha abaixo são da primeira pessoa. Em um grupo, as aulas e o financeiro ficam ligados a um só cadastro, mas cada participante tem seu próprio login."}
              </p>
            </div>
          )}

          {studentType === "grupo" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="groupName">Nome do grupo</Label>
              <Input
                id="groupName"
                name="groupName"
                placeholder="ex: Família Silva, Empresa XYZ"
                defaultValue={student?.groupName ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Usado para encontrar o grupo e seus participantes na busca.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 rounded-lg border p-3 sm:col-span-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" name="name" defaultValue={student?.name} required />
            </div>


            {isEdit ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="username">Nome de usuário (login)</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={student?.username ?? ""}
                  placeholder="ex: joao.silva"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  O aluno passa a entrar com o novo nome de usuário a partir de agora — a senha não
                  muda.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="username">Nome de usuário (login)</Label>
                  <Input id="username" name="username" placeholder="ex: joao.silva" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
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
              <DateInput id="birthDate" name="birthDate" defaultValue={student?.birthDate} />
            </div>
          </div>

          {studentType === "grupo" && !student?.isGroup && <GroupMembersEditor />}
          {isEdit && student?.isGroup && (
            <GroupMemberFieldsEditor members={student.groupMembers ?? []} />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="endDate">Data de término (opcional)</Label>
            <DateInput id="endDate" name="endDate" defaultValue={student?.endDate} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={student?.address ?? ""} />
          </div>

          <SelectHistoryEditor
            label="Curso"
            valueFieldName="courseId"
            historyFieldName="courseHistory"
            options={courses}
            defaultValue={student?.courseId}
            defaultHistory={student?.courseHistory ?? []}
          />

          <SelectHistoryEditor
            label="Plano"
            valueFieldName="planId"
            historyFieldName="planHistory"
            options={plans}
            defaultValue={student?.planId}
            defaultHistory={student?.planHistory ?? []}
          />

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
