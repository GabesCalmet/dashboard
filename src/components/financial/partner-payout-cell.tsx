"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addPartnerPayout } from "@/server/actions/payouts";
import { PayoutEntry, type PayoutEntryData } from "@/components/financial/payout-entry";
import { PayoutAddFields } from "@/components/financial/payout-add-fields";
import { formatCurrency } from "@/lib/labels";
import type { BankAccount } from "@prisma/client";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// The "Pagamento" cell on the Parceiros page — every payment made to
// this partner this month shows as its own editable chip (click it to
// change the amount/date/account, or remove it — see PayoutEntry), with
// a "+" to log another and a fixed Total that sums them all. Same
// pattern as TeacherPayoutCell.
export function PartnerPayoutCell({
  kind,
  year,
  month,
  entries,
}: {
  kind: "PARTNER_JOE" | "PARTNER_GABRIEL";
  year: number;
  month: number;
  entries: PayoutEntryData[];
}) {
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("0.00");
  const [date, setDate] = useState(todayInputValue);
  const [bankAccount, setBankAccount] = useState<BankAccount>("JOE");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const value = Number(amount);
    const paidAt = new Date(date);
    startTransition(async () => {
      try {
        await addPartnerPayout(kind, year, month, value, paidAt, bankAccount);
        toast.success("Pagamento registrado.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao registrar pagamento.");
      }
    });
  }

  return (
    <div className="min-w-56 space-y-1.5 py-1">
      <p className="text-sm">
        Total: <span className="font-semibold">{formatCurrency(total)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {entries.map((e) => (
          <PayoutEntry key={e.id} entry={e} variant="chip" />
        ))}

        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              setAmount("0.00");
              setDate(todayInputValue());
              setBankAccount("JOE");
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="size-6">
              <Plus className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <PayoutAddFields
                idPrefix={`partner-payout-${kind}`}
                amount={amount}
                onAmountChange={setAmount}
                date={date}
                onDateChange={setDate}
                bankAccount={bankAccount}
                onBankAccountChange={setBankAccount}
              />
              <Button type="button" size="sm" className="w-full" disabled={isPending} onClick={submit}>
                {isPending && <Loader2 className="animate-spin" />}
                Adicionar pagamento
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
