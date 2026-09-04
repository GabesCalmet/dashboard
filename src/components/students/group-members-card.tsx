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
  removeGroupOwner,
  updateGroupMemberValue,
  updateGroupOwnerValue,
  type ActionState,
} from "@/server/actions/students";
import { useActionToast } from "@/hooks/use-action-toast";
import { formatCurrency } from "@/lib/labels";

type Participant = {
  userId: string;
  name: string;
  username: string | null;
  monthlyValue: number;
  monthlyValueHistory: ValueHistoryEntry[];
};

// No participant is "the" student here — the shared profile (lessons,
// progress, financeiro) belongs to the group as a whole, each participant
// just has their own separate login and their own billing amount, and every
// row below behaves identically (edit value, view/change credentials,
// remove). Whichever login the underlying StudentProfile row happens to be
// keyed on ("owner") is an implementation detail, not a role — see
// removeGroupOwner for how removing that one hands the row off first.
export function GroupMembersCard({
  studentId,
  owner,
  members,
  canManage,
}: {
  studentId: string;
  owner: Participant;
  members: (Participant & { id: string })[];
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
        <ParticipantRow
          participant={owner}
          canManage={canManage}
          editAction={updateGroupOwnerValue.bind(null, studentId)}
          onRemove={() => removeGroupOwner(studentId)}
        />
        {members.map((m) => (
          <ParticipantRow
            key={m.id}
            participant={m}
            canManage={canManage}
            editAction={updateGroupMemberValue.bind(null, m.id)}
            onRemove={() => removeStudentGroupMember(m.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ParticipantRow({
  participant,
  canManage,
  editAction,
  onRemove,
}: {
  participant: Participant;
  canManage: boolean;
  editAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  onRemove: () => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{participant.name}</p>
        <p className="truncate text-xs text-muted-foreground">{participant.username}</p>
        <p className="truncate text-xs text-muted-foreground">
          Valor mensal: {formatCurrency(participant.monthlyValue)}
        </p>
      </div>
      {canManage && (
        <div className="flex flex-wrap gap-1.5">
          <EditValueDialog participant={participant} action={editAction} />
          <ViewCredentialsButton userId={participant.userId} size="sm" />
          <SetPasswordButton userId={participant.userId} size="sm" />
          <RemoveParticipantButton name={participant.name} onRemove={onRemove} />
        </div>
      )}
    </div>
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

function EditValueDialog({
  participant,
  action,
}: {
  participant: Participant;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
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
          <DialogTitle>Valor mensal — {participant.name}</DialogTitle>
          <DialogDescription>
            A cobrança mensal deste participante, separada do resto do grupo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <MonthlyValueHistoryEditor
            amountFieldName="monthlyValue"
            historyFieldName="monthlyValueHistory"
            defaultAmount={participant.monthlyValue}
            defaultHistory={participant.monthlyValueHistory}
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

function RemoveParticipantButton({ name, onRemove }: { name: string; onRemove: () => Promise<void> }) {
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
                  await onRemove();
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
