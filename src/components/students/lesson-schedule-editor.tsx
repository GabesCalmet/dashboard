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

// from/until scope when this specific entry is in effect — both optional,
// since most schedules just run for as long as the student is enrolled.
// Lets an old entry be kept on record with an "until" instead of deleted
// when a schedule changes, while the new entry's "from" picks up after it.
export type ScheduleEntry = {
  weekday: number;
  start: string;
  end: string;
  from?: string;
  until?: string;
};

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

  function updateEntry(
    id: number,
    field: "weekday" | "start" | "end" | "from" | "until",
    value: string | number
  ) {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, [field]: value } : e)));
  }

  const schedule: ScheduleEntry[] = entries.map(({ weekday, start, end, from, until }) => ({
    weekday,
    start,
    end,
    from: from || undefined,
    until: until || undefined,
  }));

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(schedule)} />

      {entries.map((entry) => (
        <div key={entry._id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2 pl-1">
            <Label className="shrink-0 text-xs font-normal text-muted-foreground">Vigência:</Label>
            <Input
              type="date"
              value={entry.from ?? ""}
              onChange={(e) => updateEntry(entry._id, "from", e.target.value)}
              aria-label={`Vigente desde — ${DAYS[entry.weekday].name}`}
              className="h-8"
            />
            <span className="shrink-0 text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={entry.until ?? ""}
              onChange={(e) => updateEntry(entry._id, "until", e.target.value)}
              placeholder="Atual"
              aria-label={`Vigente até — ${DAYS[entry.weekday].name}`}
              className="h-8"
            />
          </div>
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
