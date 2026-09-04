"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TeacherHistoryEntry = { id: string; from?: string; until?: string; rate?: number };

let nextId = 0;
type EditorEntry = TeacherHistoryEntry & { _id: number };

// Same "whichever entry covers today" rule used for monthlyValue/dueDay/etc.
function resolveCurrent(entries: TeacherHistoryEntry[]): { id: string; rate: number } {
  if (entries.length === 0) return { id: "", rate: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const covering = entries.find((e) => (!e.from || e.from <= today) && (!e.until || e.until >= today));
  const current = covering ?? entries[entries.length - 1];
  return { id: current.id, rate: current.rate ?? 0 };
}

// Like SelectHistoryEditor, but for the teacher assignment specifically —
// each entry also carries "Valor pago ao professor (R$)", the amount THAT
// teacher is paid per hour for THIS student/group (typically higher for a
// "grupo" cadastro, e.g. +R$5/hour per extra participant, entered manually
// here). Payroll resolves this per lesson instead of the teacher's own flat
// hourlyRate — see resolveTeacherPayRate in server/billing.ts.
export function TeacherAssignmentEditor({
  valueFieldName,
  historyFieldName,
  rateFieldName,
  options,
  defaultValue,
  defaultHistory = [],
  defaultRate = 0,
}: {
  valueFieldName: string;
  historyFieldName: string;
  rateFieldName: string;
  options: { id: string; label: string }[];
  defaultValue?: string | null;
  defaultHistory?: TeacherHistoryEntry[];
  defaultRate?: number;
}) {
  const [entries, setEntries] = useState<EditorEntry[]>(() =>
    defaultHistory.length > 0
      ? defaultHistory.map((e) => ({ ...e, _id: nextId++ }))
      : defaultValue
        ? [{ id: defaultValue, rate: defaultRate, _id: nextId++ }]
        : []
  );

  function addEntry() {
    setEntries((prev) => [...prev, { id: "", rate: 0, _id: nextId++ }]);
  }

  function removeEntry(id: number) {
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }

  function updateEntry(id: number, field: "id" | "from" | "until", value: string) {
    setEntries((prev) =>
      prev.map((e) => (e._id === id ? { ...e, [field]: value || undefined } : e))
    );
  }

  function updateRate(id: number, value: string) {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, rate: Number(value) } : e)));
  }

  const history: TeacherHistoryEntry[] = entries
    .filter((e) => e.id)
    .map(({ id, from, until, rate }) => ({ id, from, until, rate }));
  const current = resolveCurrent(history);

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Professor</Label>
      <input type="hidden" name={valueFieldName} value={current.id} />
      <input type="hidden" name={historyFieldName} value={JSON.stringify(history)} />
      <input type="hidden" name={rateFieldName} value={current.rate} />

      {entries.map((entry) => (
        <div key={entry._id} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <div className="min-w-40 flex-1 space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Professor</Label>
            <Select value={entry.id} onValueChange={(v) => updateEntry(entry._id, "id", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="text-xs font-normal text-muted-foreground">
              Valor pago ao professor (R$/hora)
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={entry.rate ?? 0}
              onChange={(e) => updateRate(entry._id, e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Vigência</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={entry.from ?? ""}
                onChange={(e) => updateEntry(entry._id, "from", e.target.value)}
                aria-label="Vigente desde"
              />
              <span className="shrink-0 text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={entry.until ?? ""}
                onChange={(e) => updateEntry(entry._id, "until", e.target.value)}
                placeholder="Atual"
                aria-label="Vigente até"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeEntry(entry._id)}
            aria-label="Remover professor"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum(a) professor(a) selecionado(a).</p>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
        <Plus className="size-4" /> Adicionar professor
      </Button>
    </div>
  );
}
