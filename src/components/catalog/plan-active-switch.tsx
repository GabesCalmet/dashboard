"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { togglePlanActive } from "@/server/actions/catalog";

export function PlanActiveSwitch({ planId, active }: { planId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={active}
      disabled={isPending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          await togglePlanActive(planId, checked);
          toast.success(checked ? "Plano ativado." : "Plano desativado.");
        })
      }
    />
  );
}
