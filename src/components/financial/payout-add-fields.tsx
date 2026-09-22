"use client";

import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bankAccountLabel } from "@/lib/labels";
import type { BankAccount } from "@prisma/client";

// The amount/date/account fields shared by every "add a payment" popover
// (teacher or partner) — kept in one place so the three fields stay
// identical wherever a new payout is logged.
export function PayoutAddFields({
  idPrefix,
  amount,
  onAmountChange,
  date,
  onDateChange,
  bankAccount,
  onBankAccountChange,
}: {
  idPrefix: string;
  amount: string;
  onAmountChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  bankAccount: BankAccount;
  onBankAccountChange: (value: BankAccount) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-amount`}>Valor pago</Label>
        <Input
          id={`${idPrefix}-amount`}
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-date`}>Data do pagamento</Label>
        <DateInput id={`${idPrefix}-date`} value={date} onChange={onDateChange} />
      </div>
      <div className="space-y-1.5">
        <Label>Conta</Label>
        <Select value={bankAccount} onValueChange={(v) => onBankAccountChange(v as BankAccount)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(bankAccountLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
