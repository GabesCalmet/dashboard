"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type ScheduleEntry = { weekday: number; start: string; end: string };

const DAYS = [
  { value: 0, label: "D", name: "Domingo" },
  { value: 1, label: "S", name: "Segunda" },
  { value: 2, label: "T", name: "Terça" },
  { value: 3, label: "Q", name: "Quarta" },
  { value: 4, label: "Q", name: "Quinta" },
  { value: 5, label: "S", name: "Sexta" },
  { value: 6, label: "S", name: "Sábado" },
];

export function LessonScheduleEditor({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: ScheduleEntry[];
}) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(defaultValue);

  function toggleDay(weekday: number) {
    setSchedule((prev) => {
      const exists = prev.some((e) => e.weekday === weekday);
      if (exists) return prev.filter((e) => e.weekday !== weekday);
      return [...prev, { weekday, start: "", end: "" }].sort((a, b) => a.weekday - b.weekday);
    });
  }

  function updateEntry(weekday: number, field: "start" | "end", value: string) {
    setSchedule((prev) =>
      prev.map((e) => (e.weekday === weekday ? { ...e, [field]: value } : e))
    );
  }

  const selectedDays = new Set(schedule.map((e) => e.weekday));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(schedule)} />
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

      {schedule.length > 0 && (
        <div className="space-y-2 rounded-lg border p-3">
          {schedule.map((entry) => (
            <div key={entry.weekday} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm font-medium">
                {DAYS[entry.weekday].name}
              </span>
              <Input
                type="time"
                value={entry.start}
                onChange={(e) => updateEntry(entry.weekday, "start", e.target.value)}
                aria-label={`Início — ${DAYS[entry.weekday].name}`}
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="time"
                value={entry.end}
                onChange={(e) => updateEntry(entry.weekday, "end", e.target.value)}
                aria-label={`Término — ${DAYS[entry.weekday].name}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
