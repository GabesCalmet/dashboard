"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type GroupMemberFields = {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
};

// Lets every group participant's own name/email/telefone be edited right
// from the "Editar aluno" dialog, alongside the primary's own fields at
// the top of the form — adding/removing a participant, their password,
// and their valor mensal stay on the Membros do grupo card, which needs
// its own confirmation dialogs and isn't part of this single form submit.
// See groupMemberUpdatesField in lib/validation/student.ts and
// updateStudent, which applies these to each member's User row.
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

  if (entries.length === 0) return null;

  const value = entries.map(({ userId, name, email, phone }) => ({ userId, name, email, phone }));

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Outros participantes do grupo</Label>
      <input type="hidden" name={fieldName} value={JSON.stringify(value)} />

      {entries.map((entry) => (
        <div key={entry.userId} className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
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
          <p className="col-span-2 text-xs text-muted-foreground sm:col-span-3">
            @{entry.username} — usuário, senha e valor mensal são gerenciados em &quot;Membros do
            grupo&quot;.
          </p>
        </div>
      ))}
    </div>
  );
}
