"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
import { roleLabel } from "@/components/layout/nav-config";
import { toggleUserActive, deleteUserAccount } from "@/server/actions/users";
import type { User } from "@prisma/client";

export function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{roleLabel[u.role]}</Badge>
              </TableCell>
              <TableCell>
                <Switch
                  checked={u.active}
                  disabled={u.id === currentUserId || isPending}
                  onCheckedChange={(checked) =>
                    startTransition(async () => {
                      await toggleUserActive(u.id, checked);
                      toast.success(checked ? "Usuário ativado." : "Usuário desativado.");
                    })
                  }
                />
              </TableCell>
              <TableCell className="text-right">
                {u.id !== currentUserId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação é irreversível e remove o acesso de {u.name} ao portal.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            startTransition(async () => {
                              await deleteUserAccount(u.id);
                              toast.success("Usuário excluído.");
                            });
                          }}
                        >
                          {isPending && <Loader2 className="animate-spin" />}
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
