"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 0, label: "D", name: "Domingo" },
  { value: 1, label: "S", name: "Segunda" },
  { value: 2, label: "T", name: "Terça" },
  { value: 3, label: "Q", name: "Quarta" },
  { value: 4, label: "Q", name: "Quinta" },
  { value: 5, label: "S", name: "Sexta" },
  { value: 6, label: "S", name: "Sábado" },
];

export function WeekdayPicker({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: number[];
}) {
  const [selected, setSelected] = useState<number[]>(defaultValue);

  function toggle(day: number) {
    setSelected((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected.join(",")} />
      <div className="flex gap-1.5">
        {DAYS.map((day) => {
          const active = selected.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              title={day.name}
              onClick={() => toggle(day.value)}
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
    </div>
  );
}
