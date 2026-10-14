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
import { setExpenseBankAccountOverride } from "@/server/actions/expenses";
import { bankAccountLabel } from "@/lib/labels";
import type { BankAccount } from "@prisma/client";

const DEFAULT_VALUE = "__default__";

// A simple, no-note, no-date exception: which account this ONE month's
// expense actually came out of, without touching the Expense's own
// bankAccount — which stays the real/default account for every other
// month of a recurring series. Picking "Padrão" clears the override.
export function ExpenseBankAccountSelect({
  expenseId,
  referenceMonth,
  bankAccount,
  bankAccountOverride,
}: {
  expenseId: string;
  referenceMonth: Date;
  bankAccount: BankAccount;
  bankAccountOverride: BankAccount | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={bankAccountOverride ?? DEFAULT_VALUE}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await setExpenseBankAccountOverride(
              expenseId,
              referenceMonth,
              value === DEFAULT_VALUE ? null : (value as BankAccount)
            );
            toast.success("Conta bancária atualizada.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar conta.");
          }
        })
      }
    >
      <SelectTrigger size="sm" className="w-[130px]">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT_VALUE}>Padrão ({bankAccountLabel[bankAccount]})</SelectItem>
        {Object.entries(bankAccountLabel).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
