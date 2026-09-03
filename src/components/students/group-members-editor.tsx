"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type GroupMemberEntry = {
  name: string;
  username: string;
  password: string;
  email: string;
  phone: string;
};

let nextId = 0;
type EditorEntry = GroupMemberEntry & { _id: number };

// Additional logins for a "grupo" student, submitted alongside the main
// cadastro form as one JSON field — see groupMembersField in
// lib/validation/student.ts and createStudent, which provisions one
// separate account per entry after the primary student is created.
export function GroupMembersEditor({ fieldName = "groupMembers" }: { fieldName?: string }) {
  const [entries, setEntries] = useState<EditorEntry[]>([]);

  function addEntry() {
    setEntries((prev) => [
      ...prev,
      { name: "", username: "", password: "", email: "", phone: "", _id: nextId++ },
    ]);
  }

  function removeEntry(id: number) {
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }

  function updateEntry(id: number, field: keyof GroupMemberEntry, value: string) {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, [field]: value } : e)));
  }

  const value: GroupMemberEntry[] = entries.map(({ name, username, password, email, phone }) => ({
    name,
    username,
    password,
    email,
    phone,
  }));

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Outros participantes do grupo</Label>
      <input type="hidden" name={fieldName} value={JSON.stringify(value)} />

      {entries.map((entry) => (
        <div key={entry._id} className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-normal text-muted-foreground">Nome completo</Label>
            <Input
              value={entry.name}
              onChange={(e) => updateEntry(entry._id, "name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Usuário (login)</Label>
            <Input
              value={entry.username}
              onChange={(e) => updateEntry(entry._id, "username", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Senha</Label>
            <Input
              type="text"
              value={entry.password}
              onChange={(e) => updateEntry(entry._id, "password", e.target.value)}
            />
          </div>
          <div className="flex items-end gap-1.5">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Telefone</Label>
              <Input
                value={entry.phone}
                onChange={(e) => updateEntry(entry._id, "phone", e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeEntry(entry._id)}
              aria-label="Remover participante"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-normal text-muted-foreground">Email (opcional)</Label>
            <Input
              type="email"
              value={entry.email}
              onChange={(e) => updateEntry(entry._id, "email", e.target.value)}
            />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
        <Plus className="size-4" /> Adicionar participante
      </Button>
    </div>
  );
}
