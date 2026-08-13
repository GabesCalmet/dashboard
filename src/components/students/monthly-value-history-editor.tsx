"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type ValueHistoryEntry = { amount: number; from?: string; until?: string };

let nextId = 0;
type EditorEntry = ValueHistoryEntry & { _id: number };

// Picks whichever entry covers today, else the most recently added entry
// with no "until" (still ongoing), else just the last entry — used to keep
// the plain monthlyValue column (read by simple dashboard aggregates) in
// sync with whatever the admin configured as "current" here.
function resolveCurrentAmount(entries: ValueHistoryEntry[]): number {
  if (entries.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const covering = entries.find((e) => (!e.from || e.from <= today) && (!e.until || e.until >= today));
  return covering ? covering.amount : entries[entries.length - 1].amount;
}

export function MonthlyValueHistoryEditor({
  label = "Valor mensal (R$)",
  amountFieldName,
  historyFieldName,
  defaultAmount,
  defaultHistory = [],
}: {
  label?: string;
  amountFieldName: string;
  historyFieldName: string;
  defaultAmount: number;
  defaultHistory?: ValueHistoryEntry[];
}) {
  const [entries, setEntries] = useState<EditorEntry[]>(() =>
    defaultHistory.length > 0
      ? defaultHistory.map((e) => ({ ...e, _id: nextId++ }))
      : [{ amount: defaultAmount, _id: nextId++ }]
  );

  function addEntry() {
    setEntries((prev) => [...prev, { amount: 0, _id: nextId++ }]);
  }

  function removeEntry(id: number) {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e._id !== id) : prev));
  }

  function updateEntry(id: number, field: "amount" | "from" | "until", value: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e._id === id
          ? { ...e, [field]: field === "amount" ? Number(value) : value || undefined }
          : e
      )
    );
  }

  const history: ValueHistoryEntry[] = entries.map(({ amount, from, until }) => ({
    amount,
    from,
    until,
  }));
  const currentAmount = resolveCurrentAmount(history);

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>{label}</Label>
      <input type="hidden" name={amountFieldName} value={currentAmount} />
      <input type="hidden" name={historyFieldName} value={JSON.stringify(history)} />

      {entries.map((entry) => (
        <div key={entry._id} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <div className="w-32 space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={entry.amount}
              onChange={(e) => updateEntry(entry._id, "amount", e.target.value)}
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
          {entries.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeEntry(entry._id)}
              aria-label="Remover valor"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
        <Plus className="size-4" /> Adicionar valor
      </Button>
    </div>
  );
}
