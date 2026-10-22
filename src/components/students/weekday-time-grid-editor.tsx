"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { TimeInput } from "@/components/ui/time-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WeekdayTimeEntry = { weekday: number; start: string; end: string };

const DAYS = [
  { value: 0, label: "D", name: "Domingo" },
  { value: 1, label: "S", name: "Segunda" },
  { value: 2, label: "T", name: "Terça" },
  { value: 3, label: "Q", name: "Quarta" },
  { value: 4, label: "Q", name: "Quinta" },
  { value: 5, label: "S", name: "Sexta" },
  { value: 6, label: "S", name: "Sábado" },
];

let nextId = 0;
type Entry = WeekdayTimeEntry & { _id: number };

function groupByWeekday(entries: Entry[]): [number, Entry[]][] {
  const groups = new Map<number, Entry[]>();
  for (const e of entries) {
    const list = groups.get(e.weekday) ?? [];
    list.push(e);
    groups.set(e.weekday, list);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

// Just the weekday/time grid from LessonScheduleEditor, without any
// per-block vigência — used by the "Adicionar aula" new-period dialog,
// where every day/time in one submission shares a single vigência set
// once at the top of that dialog (periodFrom/periodUntil), not per entry.
export function WeekdayTimeGridEditor({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: WeekdayTimeEntry[];
}) {
  const [entries, setEntries] = useState<Entry[]>(() =>
    defaultValue.map((e) => ({ ...e, _id: nextId++ }))
  );

  function toggleDay(weekday: number) {
    setEntries((prev) => {
      const exists = prev.some((e) => e.weekday === weekday);
      return exists
        ? prev.filter((e) => e.weekday !== weekday)
        : [...prev, { _id: nextId++, weekday, start: "", end: "" }].sort(
            (a, b) => a.weekday - b.weekday
          );
    });
  }

  function addTimeSlot(weekday: number) {
    setEntries((prev) => {
      const next = [...prev];
      let insertAt = next.length;
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].weekday === weekday) {
          insertAt = i + 1;
          break;
        }
      }
      next.splice(insertAt, 0, { _id: nextId++, weekday, start: "", end: "" });
      return next;
    });
  }

  function removeTimeSlot(id: number) {
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }

  function updateEntry(id: number, field: "start" | "end", value: string) {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, [field]: value } : e)));
  }

  const value: WeekdayTimeEntry[] = entries.map(({ weekday, start, end }) => ({
    weekday,
    start,
    end,
  }));
  const selectedDays = new Set(entries.map((e) => e.weekday));

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <input type="hidden" name={name} value={JSON.stringify(value)} />

      <div className="flex gap-1.5">
        {DAYS.map((day) => {
          const active = selectedDays.has(day.value);
          return (
            <button
              key={day.value}
              type="button"
              title={day.name}
              onClick={() => toggleDay(day.value)}
              aria-pressed={active}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-input bg-transparent text-muted-foreground hover:bg-secondary"
              )}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          {groupByWeekday(entries).map(([weekday, dayEntries]) => (
            <div key={weekday} className="space-y-2">
              {dayEntries.map((e, idx) => (
                <div key={e._id} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-sm font-medium">
                    {idx === 0 ? DAYS[weekday].name : ""}
                  </span>
                  <TimeInput
                    value={e.start}
                    onChange={(v) => updateEntry(e._id, "start", v)}
                    aria-label={`Início — ${DAYS[weekday].name}`}
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">até</span>
                  <TimeInput
                    value={e.end}
                    onChange={(v) => updateEntry(e._id, "end", v)}
                    aria-label={`Término — ${DAYS[weekday].name}`}
                  />
                  {idx === dayEntries.length - 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => addTimeSlot(weekday)}
                      aria-label={`Adicionar outro horário — ${DAYS[weekday].name}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTimeSlot(e._id)}
                      aria-label={`Remover este horário — ${DAYS[weekday].name}`}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">Selecione os dias da semana.</p>
      )}
    </div>
  );
}
