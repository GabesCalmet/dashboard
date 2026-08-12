"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ScheduleEntry = { weekday: number; start: string; end: string };

const DAYS = [
  { value: 0, name: "Domingo" },
  { value: 1, name: "Segunda" },
  { value: 2, name: "Terça" },
  { value: 3, name: "Quarta" },
  { value: 4, name: "Quinta" },
  { value: 5, name: "Sexta" },
  { value: 6, name: "Sábado" },
];

// Local-only id so each row can be edited/removed independently — never
// persisted, since a student can now have more than one entry on the same
// weekday (e.g. an old time kept on record alongside a newly added one
// after a schedule change).
let nextId = 0;
type EditorEntry = ScheduleEntry & { _id: number };

export function LessonScheduleEditor({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: ScheduleEntry[];
}) {
  const [entries, setEntries] = useState<EditorEntry[]>(() =>
    defaultValue.map((e) => ({ ...e, _id: nextId++ }))
  );

  function addEntry() {
    setEntries((prev) => [...prev, { weekday: 1, start: "", end: "", _id: nextId++ }]);
  }

  function removeEntry(id: number) {
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }

  function updateEntry(id: number, field: "weekday" | "start" | "end", value: string | number) {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, [field]: value } : e)));
  }

  const schedule: ScheduleEntry[] = entries.map(({ weekday, start, end }) => ({
    weekday,
    start,
    end,
  }));

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(schedule)} />

      {entries.map((entry) => (
        <div key={entry._id} className="flex items-center gap-2">
          <Select
            value={String(entry.weekday)}
            onValueChange={(v) => updateEntry(entry._id, "weekday", Number(v))}
          >
            <SelectTrigger className="w-32 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="time"
            value={entry.start}
            onChange={(e) => updateEntry(entry._id, "start", e.target.value)}
            aria-label={`Início — ${DAYS[entry.weekday].name}`}
          />
          <span className="shrink-0 text-sm text-muted-foreground">até</span>
          <Input
            type="time"
            value={entry.end}
            onChange={(e) => updateEntry(entry._id, "end", e.target.value)}
            aria-label={`Término — ${DAYS[entry.weekday].name}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeEntry(entry._id)}
            aria-label="Remover horário"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum horário adicionado ainda.</p>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
        <Plus className="size-4" /> Adicionar horário
      </Button>
    </div>
  );
}
