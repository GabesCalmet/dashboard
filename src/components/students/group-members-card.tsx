"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ViewCredentialsButton } from "@/components/shared/view-credentials-button";
import { SetPasswordButton } from "@/components/shared/set-password-button";
import {
  MonthlyValueHistoryEditor,
  type ValueHistoryEntry,
} from "@/components/students/monthly-value-history-editor";
import {
  addStudentGroupMember,
  removeStudentGroupMember,
  updateGroupMemberValue,
} from "@/server/actions/students";
import { useActionToast } from "@/hooks/use-action-toast";
import { formatCurrency } from "@/lib/labels";

type Member = {
  id: string;
  userId: string;
  name: string;
  username: string | null;
  monthlyValue: number;
  monthlyValueHistory: ValueHistoryEntry[];
};

export function GroupMembersCard({
  studentId,
  primary,
  members,
  canManage,
}: {
  studentId: string;
  primary: { userId: string; name: string; username: string | null; monthlyValue: number };
  members: Member[];
  canManage: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" /> Membros do grupo
        </CardTitle>
        {canManage && <AddGroupMemberDialog studentId={studentId} />}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {primary.name} <span className="text-xs font-normal text-muted-foreground">(principal)</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{primary.username}</p>
            <p className="truncate text-xs text-muted-foreground">
              Valor mensal: {formatCurrency(primary.monthlyValue)}
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-1.5">
              <ViewCredentialsButton userId={primary.userId} size="sm" />
              <SetPasswordButton userId={primary.userId} size="sm" />
            </div>
          )}
        </div>
        {members.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.username}</p>
              <p className="truncate text-xs text-muted-foreground">
                Valor mensal: {formatCurrency(m.monthlyValue)}
              </p>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-1.5">
                <EditMemberValueDialog member={m} />
                <ViewCredentialsButton userId={m.userId} size="sm" />
                <SetPasswordButton userId={m.userId} size="sm" />
                <RemoveMemberButton memberId={m.id} name={m.name} />
              </div>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum outro participante além do cadastro principal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AddGroupMemberDialog({ studentId }: { studentId: string }) {
  const action = addStudentGroupMember.bind(null, studentId);
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar participante do grupo</DialogTitle>
          <DialogDescription>
            Cria um login próprio que acessa o mesmo cadastro (aulas, progresso e financeiro), com
            sua própria cobrança mensal.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="member-name">Nome completo</Label>
            <Input id="member-name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-username">Usuário (login)</Label>
            <Input id="member-username" name="username" placeholder="ex: joao.silva" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-password">Senha</Label>
            <Input
              id="member-password"
              name="password"
              type="text"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-monthlyValue">Valor mensal (R$)</Label>
            <Input id="member-monthlyValue" name="monthlyValue" type="number" step="0.01" defaultValue={0} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-email">Email (opcional)</Label>
            <Input id="member-email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-phone">Telefone (opcional)</Label>
            <Input id="member-phone" name="phone" />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMemberValueDialog({ member }: { member: Member }) {
  const action = updateGroupMemberValue.bind(null, member.id);
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Valor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valor mensal — {member.name}</DialogTitle>
          <DialogDescription>
            A cobrança mensal deste participante, separada do resto do grupo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <MonthlyValueHistoryEditor
            amountFieldName="monthlyValue"
            historyFieldName="monthlyValueHistory"
            defaultAmount={member.monthlyValue}
            defaultHistory={member.monthlyValueHistory}
          />

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveMemberButton({ memberId, name }: { memberId: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover participante</AlertDialogTitle>
          <AlertDialogDescription>
            O login de <strong>{name}</strong> será excluído permanentemente. O restante do grupo
            (aulas, progresso e financeiro) continua intacto. Não pode ser desfeito.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  await removeStudentGroupMember(memberId);
                  toast.success("Participante removido.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao remover.");
                }
              });
            }}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Confirmar remoção
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
