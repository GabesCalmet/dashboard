"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resyncStudentPayments } from "@/server/actions/payments";

// Re-derives amount/dueDate on every existing cobrança (any status) from
// the student's current billing config right now, instead of waiting for
// someone to notice a stale row and ask for a manual fix — mainly useful
// right after changing dueDay/monthlyValue/billingStartDate.
export function ResyncPaymentsButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const { updated, created } = await resyncStudentPayments(studentId);
            if (updated === 0 && created === 0) {
              toast.success("Cobranças já estavam em dia.");
            } else {
              const parts = [];
              if (created > 0) parts.push(`${created} criada(s)`);
              if (updated > 0) parts.push(`${updated} atualizada(s)`);
              toast.success(`Cobranças: ${parts.join(", ")}.`);
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar cobranças.");
          }
        })
      }
    >
      {isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      Atualizar cobranças
    </Button>
  );
}
