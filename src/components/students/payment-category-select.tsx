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

// Mirrors PaymentBankAccountSelect exactly — which Categoria this ONE
// month's cobrança actually shows, without touching the charge
// definition's own category. Picking "Padrão" clears the override.
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
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          // The trigger always shows the plain resolved label (e.g. just
          // "Silver") — never "Padrão (Silver)" — regardless of whether
          // that came from an explicit override or is inherited from the
          // charge. The list below still spells out "Padrão (...)" for
          // the inherited option, so it's clear which one clears the
          // override.
          <SelectValue>
            {categoryOverride
              ? chargeCategoryLabel[categoryOverride]
              : (category && chargeCategoryLabel[category]) || "Nenhuma"}
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT_VALUE}>
          Padrão {category ? `(${chargeCategoryLabel[category]})` : "(nenhuma)"}
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
