"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setCobrancaStatus } from "@/server/actions/payments";
import { paymentStatusLabel } from "@/lib/labels";
import type { PaymentStatus } from "@prisma/client";

export function PaymentStatusSelect({
  studentId,
  payerName,
  status,
  referenceMonth,
}: {
  studentId: string;
  payerName: string | null;
  status: PaymentStatus;
  referenceMonth: Date;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await setCobrancaStatus(studentId, payerName, value as PaymentStatus, referenceMonth);
            toast.success("Status do pagamento atualizado.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
          }
        })
      }
    >
      <SelectTrigger size="sm" className="w-[130px]">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {Object.entries(paymentStatusLabel).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
