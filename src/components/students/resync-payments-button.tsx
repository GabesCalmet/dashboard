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
            const updated = await resyncStudentPayments(studentId);
            toast.success(
              updated > 0 ? `${updated} cobrança(s) atualizada(s).` : "Cobranças já estavam em dia."
            );
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
