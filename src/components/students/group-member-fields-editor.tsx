"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MonthlyValueHistoryEditor,
  type ValueHistoryEntry,
} from "@/components/students/monthly-value-history-editor";
import { bankAccountLabel } from "@/lib/labels";
import type { BankAccount } from "@prisma/client";

export type GroupMemberFields = {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  monthlyValue: number;
  monthlyValueHistory: ValueHistoryEntry[];
  dueDay: number;
  dueDayHistory: ValueHistoryEntry[];
  bankAccount: BankAccount;
};

// Lets every group participant's own name/email/telefone and billing
// (valor, conta bancária, dia de vencimento) be edited right from the
// "Editar aluno" dialog, alongside the primary's own fields above — adding/
// removing a participant, their password, and username stay on the
// Membros do grupo card, which needs its own confirmation dialogs and
// isn't part of this single form submit (its own "Valor" quick-edit there
// still works too; this is just another way to reach the same field). See
// groupMemberUpdatesField in lib/validation/student.ts and updateStudent,
// which applies these to each member's User and StudentGroupMember rows.
// Each participant's block mirrors the exact field layout/style used for
// the primary above it — one full-width field per row, not a cramped
// multi-column grid — so every participant looks the same regardless of
// which one happens to be the form's "primary".
export function GroupMemberFieldsEditor({
  members,
  fieldName = "groupMemberUpdates",
}: {
  members: GroupMemberFields[];
  fieldName?: string;
}) {
  const [entries, setEntries] = useState(
    members.map((m) => ({ ...m, email: m.email ?? "", phone: m.phone ?? "" }))
  );

  function update(userId: string, field: "name" | "email" | "phone" | "bankAccount", value: string) {
    setEntries((prev) => prev.map((e) => (e.userId === userId ? { ...e, [field]: value } : e)));
  }

  function updateValue(userId: string, amount: number, history: ValueHistoryEntry[]) {
    setEntries((prev) =>
      prev.map((e) =>
        e.userId === userId ? { ...e, monthlyValue: amount, monthlyValueHistory: history } : e
      )
    );
  }

  function updateDueDay(userId: string, day: number, history: ValueHistoryEntry[]) {
    setEntries((prev) =>
      prev.map((e) => (e.userId === userId ? { ...e, dueDay: day, dueDayHistory: history } : e))
    );
  }

  if (entries.length === 0) return null;

  const value = entries.map(
    ({ userId, name, email, phone, monthlyValue, monthlyValueHistory, dueDay, dueDayHistory, bankAccount }) => ({
      userId,
      name,
      email,
      phone,
      monthlyValue,
      monthlyValueHistory,
      dueDay,
      dueDayHistory,
      bankAccount,
    })
  );

  return (
    <div className="space-y-4 sm:col-span-2">
      <Label>Outros participantes do grupo</Label>
      <input type="hidden" name={fieldName} value={JSON.stringify(value)} />

      {entries.map((entry) => (
        <div key={entry.userId} className="grid grid-cols-1 gap-4 rounded-lg border p-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome completo</Label>
            <Input value={entry.name} onChange={(e) => update(entry.userId, "name", e.target.value)} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome de usuário (login)</Label>
            <Input value={entry.username ?? ""} disabled readOnly />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Email de contato (opcional)</Label>
            <Input
              type="email"
              value={entry.email}
              onChange={(e) => update(entry.userId, "email", e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Telefone</Label>
            <Input value={entry.phone} onChange={(e) => update(entry.userId, "phone", e.target.value)} />
          </div>

          <MonthlyValueHistoryEditor
            defaultAmount={entry.monthlyValue}
            defaultHistory={entry.monthlyValueHistory}
            onChange={(amount, history) => updateValue(entry.userId, amount, history)}
          />

          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            <Select
              value={entry.bankAccount}
              onValueChange={(v) => update(entry.userId, "bankAccount", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(bankAccountLabel).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MonthlyValueHistoryEditor
            label="Dia de vencimento do boleto"
            amountLabel="Dia"
            step="1"
            min={1}
            max={31}
            defaultAmount={entry.dueDay}
            defaultHistory={entry.dueDayHistory}
            onChange={(day, history) => updateDueDay(entry.userId, day, history)}
          />

          <p className="text-xs text-muted-foreground sm:col-span-2">
            Usuário e senha são gerenciados em &quot;Membros do grupo&quot;.
          </p>
        </div>
      ))}
    </div>
  );
}
