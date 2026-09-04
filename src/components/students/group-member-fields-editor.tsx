"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MonthlyValueHistoryEditor,
  type ValueHistoryEntry,
} from "@/components/students/monthly-value-history-editor";

export type GroupMemberFields = {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  monthlyValue: number;
  monthlyValueHistory: ValueHistoryEntry[];
};

// Lets every group participant's own name/email/telefone and valor mensal
// be edited right from the "Editar aluno" dialog, alongside the primary's
// own fields at the top of the form — adding/removing a participant, their
// password, and username stay on the Membros do grupo card, which needs
// its own confirmation dialogs and isn't part of this single form submit
// (its own "Valor" quick-edit there still works too; this is just another
// way to reach the same field). See groupMemberUpdatesField in
// lib/validation/student.ts and updateStudent, which applies these to
// each member's User and StudentGroupMember rows.
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

  function update(userId: string, field: "name" | "email" | "phone", value: string) {
    setEntries((prev) => prev.map((e) => (e.userId === userId ? { ...e, [field]: value } : e)));
  }

  function updateValue(userId: string, amount: number, history: ValueHistoryEntry[]) {
    setEntries((prev) =>
      prev.map((e) =>
        e.userId === userId ? { ...e, monthlyValue: amount, monthlyValueHistory: history } : e
      )
    );
  }

  if (entries.length === 0) return null;

  const value = entries.map(({ userId, name, email, phone, monthlyValue, monthlyValueHistory }) => ({
    userId,
    name,
    email,
    phone,
    monthlyValue,
    monthlyValueHistory,
  }));

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Outros participantes do grupo</Label>
      <input type="hidden" name={fieldName} value={JSON.stringify(value)} />

      {entries.map((entry) => (
        <div key={entry.userId} className="space-y-3 rounded-lg border p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Nome completo</Label>
              <Input value={entry.name} onChange={(e) => update(entry.userId, "name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={entry.email}
                onChange={(e) => update(entry.userId, "email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Telefone</Label>
              <Input value={entry.phone} onChange={(e) => update(entry.userId, "phone", e.target.value)} />
            </div>
          </div>

          <MonthlyValueHistoryEditor
            label={`Valor mensal (R$) — ${entry.name || "participante"}`}
            defaultAmount={entry.monthlyValue}
            defaultHistory={entry.monthlyValueHistory}
            onChange={(amount, history) => updateValue(entry.userId, amount, history)}
          />

          <p className="text-xs text-muted-foreground">
            @{entry.username} — usuário e senha são gerenciados em &quot;Membros do grupo&quot;.
          </p>
        </div>
      ))}
    </div>
  );
}
