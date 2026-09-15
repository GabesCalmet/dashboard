"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/labels";
import { markPartnerPayoutPaid, unmarkPartnerPayoutPaid } from "@/server/actions/payouts";

// Toggles whether a partner's (Joe/Gabriel) payout for one month is
// actually paid. Marking it locks in the amount server-side — only a
// paid month counts toward Gasto efetuado/Em caixa and the Gastos page's
// Parceiros Realizado box; the live Previsto forecast is unaffected.
export function PayoutPaidButton({
  kind,
  year,
  month,
  paid,
  amount,
  paidAt,
}: {
  kind: "PARTNER_JOE" | "PARTNER_GABRIEL";
  year: number;
  month: number;
  paid: boolean;
  amount: number | null;
  paidAt: Date | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (paid) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">
          <Check className="size-3" /> Pago em {paidAt ? formatDate(paidAt) : "—"} —{" "}
          {formatCurrency(amount ?? 0)}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await unmarkPartnerPayoutPaid(kind, year, month);
                toast.success("Pagamento desmarcado.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro ao desmarcar pagamento.");
              }
            })
          }
        >
          {isPending && <Loader2 className="animate-spin" />}
          Desfazer
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await markPartnerPayoutPaid(kind, year, month);
            toast.success("Marcado como pago.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao marcar como pago.");
          }
        })
      }
    >
      {isPending && <Loader2 className="animate-spin" />}
      Marcar como pago
    </Button>
  );
}
