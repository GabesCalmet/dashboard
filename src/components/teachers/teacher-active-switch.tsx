"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleUserActive } from "@/server/actions/users";

export function TeacherActiveSwitch({ userId, active }: { userId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={active}
        disabled={isPending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            await toggleUserActive(userId, checked);
            toast.success(checked ? "Professor ativado." : "Professor desativado.");
          })
        }
      />
      <span className="text-sm text-muted-foreground">
        {active ? "Ativo" : "Inativo"}
      </span>
    </div>
  );
}
