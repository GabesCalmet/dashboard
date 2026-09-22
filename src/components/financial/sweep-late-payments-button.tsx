"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runLatePaymentsSweep } from "@/server/actions/payments";

// Manual fallback for the daily mark-late-payments cron, for when it
// didn't run on schedule (e.g. Vercel account hitting a plan/usage limit).
// Runs the exact same sweep on demand: auto-generates this month's missing
// cobranças, then flips any overdue Pendente to Atrasado.
export function SweepLatePaymentsButton() {
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        const { generated, markedLate } = await runLatePaymentsSweep();
        if (generated === 0 && markedLate === 0) {
          toast.success("Tudo em dia — nada para atualizar.");
        } else {
          toast.success(
            `${generated} cobrança(s) gerada(s), ${markedLate} marcada(s) como atrasada(s).`
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao rodar a verificação.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      Verificar pagamentos atrasados
    </Button>
  );
}
