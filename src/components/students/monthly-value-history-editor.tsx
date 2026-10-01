"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
  amountLabel = "Valor (R$)",
  amountFieldName,
  historyFieldName,
  defaultAmount,
  defaultHistory = [],
  step = "0.01",
  min,
  max,
  onChange,
  extraFieldLabel,
  extraFieldName,
  defaultExtraValue,
}: {
  label?: string;
  // Label shown on the numeric field itself — the outer `label` is just
  // the group heading, which reads oddly reused per-row for non-currency
  // fields like "Dia de vencimento" or "Aulas por mês".
  amountLabel?: string;
  // Omit both field names to use this in "controlled" mode instead — no
  // hidden inputs of its own, just reports every change via onChange so a
  // parent editing several of these at once (one per group participant,
  // say) can fold them all into its own single aggregated field.
  amountFieldName?: string;
  historyFieldName?: string;
  defaultAmount: number;
  defaultHistory?: ValueHistoryEntry[];
  step?: string;
  min?: number;
  max?: number;
  onChange?: (amount: number, history: ValueHistoryEntry[]) => void;
  // An unrelated flat field (no vigência of its own) rendered inline next
  // to the amount — e.g. "Aulas contratadas/mês" sitting right beside
  // "Valor (R$)" since they're set together at a glance, even though they
  // don't share a history/vigência. Only one shared value is tracked
  // (not one per vigência block) — if more than one amount block exists,
  // every block's row edits the same underlying value, kept in sync.
  extraFieldLabel?: string;
  extraFieldName?: string;
  defaultExtraValue?: number;
}) {
  const [entries, setEntries] = useState<EditorEntry[]>(() =>
    defaultHistory.length > 0
      ? defaultHistory.map((e) => ({ ...e, _id: nextId++ }))
      : [{ amount: defaultAmount, _id: nextId++ }]
  );
  const [extraValue, setExtraValue] = useState(defaultExtraValue ?? 0);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onChange?.(currentAmount, history), [JSON.stringify(history)]);

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>{label}</Label>
      {amountFieldName && <input type="hidden" name={amountFieldName} value={currentAmount} />}
      {historyFieldName && (
        <input type="hidden" name={historyFieldName} value={JSON.stringify(history)} />
      )}
      {extraFieldName && <input type="hidden" name={extraFieldName} value={extraValue} />}

      {entries.map((entry) => (
        <div key={entry._id} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <div className="w-32 space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">{amountLabel}</Label>
            <Input
              type="number"
              step={step}
              min={min}
              max={max}
              value={entry.amount}
              onChange={(e) => updateEntry(entry._id, "amount", e.target.value)}
            />
          </div>
          {extraFieldLabel && (
            <div className="w-32 space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">{extraFieldLabel}</Label>
              <Input
                type="number"
                min={0}
                value={extraValue}
                onChange={(e) => setExtraValue(Number(e.target.value))}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Vigência</Label>
            <div className="flex items-center gap-2">
              <DateInput
                value={entry.from ?? ""}
                onChange={(iso) => updateEntry(entry._id, "from", iso)}
                aria-label="Vigente desde"
              />
              <span className="shrink-0 text-xs text-muted-foreground">até</span>
              <DateInput
                value={entry.until ?? ""}
                onChange={(iso) => updateEntry(entry._id, "until", iso)}
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
