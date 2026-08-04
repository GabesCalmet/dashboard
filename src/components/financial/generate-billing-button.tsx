"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMonthlyPayments } from "@/server/actions/payments";

export function GenerateBillingButton({ year, month }: { year: number; month: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await generateMonthlyPayments(new Date(year, month, 1));
          toast.success("Cobranças do mês geradas para alunos ativos.");
          router.refresh();
        })
      }
    >
      {isPending ? <Loader2 className="animate-spin" /> : <ReceiptText />}
      Gerar cobranças do mês
    </Button>
  );
}
