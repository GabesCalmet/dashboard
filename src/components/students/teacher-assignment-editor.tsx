"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TeacherPayMode = "HOURLY" | "MONTHLY";

export type TeacherHistoryEntry = {
  id: string;
  from?: string;
  until?: string;
  rate?: number;
  mode?: TeacherPayMode;
  monthlyAmount?: number;
};

let nextId = 0;
type EditorEntry = TeacherHistoryEntry & { _id: number };

// Same "whichever entry covers today" rule used for monthlyValue/dueDay/etc.
function resolveCurrent(
  entries: TeacherHistoryEntry[]
): { id: string; rate: number; mode: TeacherPayMode; monthlyAmount: number } {
  if (entries.length === 0) return { id: "", rate: 0, mode: "HOURLY", monthlyAmount: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const covering = entries.find((e) => (!e.from || e.from <= today) && (!e.until || e.until >= today));
  const current = covering ?? entries[entries.length - 1];
  return {
    id: current.id,
    rate: current.rate ?? 0,
    mode: current.mode ?? "HOURLY",
    monthlyAmount: current.monthlyAmount ?? 0,
  };
}

// Like SelectHistoryEditor, but for the teacher assignment specifically —
// each entry carries either an hourly rate ("Valor pago ao professor
// (R$/hora)") or, when switched to "Mensal fixo", a flat monthly amount
// paid regardless of how many classes actually happen that month (same
// idea as the Individual/Grupo switch above). Payroll resolves whichever
// mode is in effect per lesson instead of the teacher's own flat
// hourlyRate — see resolveTeacherAssignment in server/queries/teachers.ts.
export function TeacherAssignmentEditor({
  valueFieldName,
  historyFieldName,
  rateFieldName,
  modeFieldName,
  monthlyAmountFieldName,
  options,
  defaultValue,
  defaultHistory = [],
  defaultRate = 0,
  defaultMode = "HOURLY",
  defaultMonthlyAmount = 0,
}: {
  valueFieldName: string;
  historyFieldName: string;
  rateFieldName: string;
  modeFieldName: string;
  monthlyAmountFieldName: string;
  options: { id: string; label: string }[];
  defaultValue?: string | null;
  defaultHistory?: TeacherHistoryEntry[];
  defaultRate?: number;
  defaultMode?: TeacherPayMode;
  defaultMonthlyAmount?: number;
}) {
  const [entries, setEntries] = useState<EditorEntry[]>(() =>
    defaultHistory.length > 0
      ? defaultHistory.map((e) => ({ ...e, _id: nextId++ }))
      : defaultValue
        ? [
            {
              id: defaultValue,
              rate: defaultRate,
              mode: defaultMode,
              monthlyAmount: defaultMonthlyAmount,
              _id: nextId++,
            },
          ]
        : []
  );

  function addEntry() {
    setEntries((prev) => [...prev, { id: "", rate: 0, mode: "HOURLY", monthlyAmount: 0, _id: nextId++ }]);
  }

  // Adds a new Valor/Vigência entry for the CURRENT teacher, without
  // reselecting them — for when a participant leaves or joins the group
  // and the rate needs to change but the teacher doesn't (unlike
  // "Adicionar professor", which starts blank for an actual teacher
  // change).
  function addPaymentEntry() {
    setEntries((prev) => {
      const history = prev
        .filter((e) => e.id)
        .map(({ id, from, until, rate, mode, monthlyAmount }) => ({
          id,
          from,
          until,
          rate,
          mode,
          monthlyAmount,
        }));
      const currentTeacherId = resolveCurrent(history).id;
      return [...prev, { id: currentTeacherId, rate: 0, mode: "HOURLY", monthlyAmount: 0, _id: nextId++ }];
    });
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

  function updateMonthlyAmount(id: number, value: string) {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, monthlyAmount: Number(value) } : e)));
  }

  function updateMode(id: number, mode: TeacherPayMode) {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, mode } : e)));
  }

  const history: TeacherHistoryEntry[] = entries
    .filter((e) => e.id)
    .map(({ id, from, until, rate, mode, monthlyAmount }) => ({
      id,
      from,
      until,
      rate,
      mode,
      monthlyAmount,
    }));
  const current = resolveCurrent(history);

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Professor</Label>
      <input type="hidden" name={valueFieldName} value={current.id} />
      <input type="hidden" name={historyFieldName} value={JSON.stringify(history)} />
      <input type="hidden" name={rateFieldName} value={current.rate} />
      <input type="hidden" name={modeFieldName} value={current.mode} />
      <input type="hidden" name={monthlyAmountFieldName} value={current.monthlyAmount} />

      {entries.map((entry) => {
        const mode = entry.mode ?? "HOURLY";
        return (
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

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant={mode === "HOURLY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateMode(entry._id, "HOURLY")}
                >
                  Por hora
                </Button>
                <Button
                  type="button"
                  variant={mode === "MONTHLY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateMode(entry._id, "MONTHLY")}
                >
                  Mensal fixo
                </Button>
              </div>

              {mode === "HOURLY" ? (
                <>
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
                </>
              ) : (
                <>
                  <Label className="text-xs font-normal text-muted-foreground">
                    Valor mensal fixo pago ao professor (R$)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={entry.monthlyAmount ?? 0}
                    onChange={(e) => updateMonthlyAmount(entry._id, e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O professor recebe este valor cheio todo mês, independente da quantidade de aulas
                    dadas.
                  </p>
                </>
              )}
            </div>
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
        );
      })}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum(a) professor(a) selecionado(a).</p>
      )}

      {entries.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={addPaymentEntry}>
          <Plus className="size-4" /> Adicionar pagamento
        </Button>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
        <Plus className="size-4" /> Adicionar professor
      </Button>
    </div>
  );
}
