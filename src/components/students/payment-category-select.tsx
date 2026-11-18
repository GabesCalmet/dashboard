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
import { setPaymentCategoryOverride } from "@/server/actions/payments";
import { chargeCategoryLabel } from "@/lib/labels";
import type { ChargeCategory } from "@prisma/client";

const DEFAULT_VALUE = "__default__";

// Mirrors PaymentBankAccountSelect — which Categoria this ONE month's
// cobrança actually shows, without touching the charge definition's own
// category. The default option's own label is just the resolved category
// (not prefixed with "Padrão"), so the trigger always shows a plain tier
// name; picking it explicitly clears any override.
export function PaymentCategorySelect({
  studentId,
  payerName,
  referenceMonth,
  category,
  categoryOverride,
}: {
  studentId: string;
  payerName: string | null;
  referenceMonth: Date;
  category: ChargeCategory | null;
  categoryOverride: ChargeCategory | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={categoryOverride ?? DEFAULT_VALUE}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await setPaymentCategoryOverride(
              studentId,
              payerName,
              referenceMonth,
              value === DEFAULT_VALUE ? null : (value as ChargeCategory)
            );
            toast.success("Categoria atualizada.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar categoria.");
          }
        })
      }
    >
      <SelectTrigger size="sm" className="w-[130px]">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT_VALUE}>
          {category ? chargeCategoryLabel[category] : "Nenhuma"}
        </SelectItem>
        {Object.entries(chargeCategoryLabel).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
