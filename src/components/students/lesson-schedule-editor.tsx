"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Flat shape persisted to the DB — one row per weekday/time. from/until
// (both optional) scope when that specific entry is in effect: undefined
// means "since enrollment" / "still ongoing". Entries sharing the same
// from/until are grouped back into one visual block when the editor loads.
export type ScheduleEntry = {
  weekday: number;
  start: string;
  end: string;
  from?: string;
  until?: string;
};

const DAYS = [
  { value: 0, label: "D", name: "Domingo" },
  { value: 1, label: "S", name: "Segunda" },
  { value: 2, label: "T", name: "Terça" },
  { value: 3, label: "Q", name: "Quarta" },
  { value: 4, label: "Q", name: "Quinta" },
  { value: 5, label: "S", name: "Sexta" },
  { value: 6, label: "S", name: "Sábado" },
];

type BlockDay = { weekday: number; start: string; end: string };
type Block = { _id: number; from: string; until: string; days: BlockDay[] };

let nextId = 0;

// Groups a flat entry list back into blocks by matching from/until — an
// old schedule kept on record (with an "until") and a newly added one
// (with a later "from") land in separate blocks; entries with no range at
// all (the common case) all land together in one block.
function toBlocks(entries: ScheduleEntry[]): Block[] {
  const groups = new Map<string, Block>();
  for (const e of entries) {
    const from = e.from ?? "";
    const until = e.until ?? "";
    const key = `${from}::${until}`;
    let block = groups.get(key);
    if (!block) {
      block = { _id: nextId++, from, until, days: [] };
      groups.set(key, block);
    }
    block.days.push({ weekday: e.weekday, start: e.start, end: e.end });
  }
  return [...groups.values()];
}

export function LessonScheduleEditor({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: ScheduleEntry[];
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => toBlocks(defaultValue));

  function addBlock() {
    setBlocks((prev) => [...prev, { _id: nextId++, from: "", until: "", days: [] }]);
  }

  function removeBlock(id: number) {
    setBlocks((prev) => prev.filter((b) => b._id !== id));
  }

  function updateBlockRange(id: number, field: "from" | "until", value: string) {
    setBlocks((prev) => prev.map((b) => (b._id === id ? { ...b, [field]: value } : b)));
  }

  function toggleDay(blockId: number, weekday: number) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b._id !== blockId) return b;
        const exists = b.days.some((d) => d.weekday === weekday);
        const days = exists
          ? b.days.filter((d) => d.weekday !== weekday)
          : [...b.days, { weekday, start: "", end: "" }].sort((a, c) => a.weekday - c.weekday);
        return { ...b, days };
      })
    );
  }

  function updateDay(blockId: number, weekday: number, field: "start" | "end", value: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b._id !== blockId
          ? b
          : { ...b, days: b.days.map((d) => (d.weekday === weekday ? { ...d, [field]: value } : d)) }
      )
    );
  }

  const schedule: ScheduleEntry[] = blocks.flatMap((b) =>
    b.days.map((d) => ({
      ...d,
      from: b.from || undefined,
      until: b.until || undefined,
    }))
  );

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(schedule)} />

      {blocks.map((block) => {
        const selectedDays = new Set(block.days.map((d) => d.weekday));
        return (
          <div key={block._id} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex gap-1.5">
                {DAYS.map((day) => {
                  const active = selectedDays.has(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      title={day.name}
                      onClick={() => toggleDay(block._id, day.value)}
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeBlock(block._id)}
                aria-label="Remover este horário"
              >
                <X className="size-4" />
              </Button>
            </div>

            {block.days.length > 0 && (
              <div className="space-y-2">
                {block.days.map((d) => (
                  <div key={d.weekday} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-sm font-medium">
                      {DAYS[d.weekday].name}
                    </span>
                    <Input
                      type="time"
                      value={d.start}
                      onChange={(e) => updateDay(block._id, d.weekday, "start", e.target.value)}
                      aria-label={`Início — ${DAYS[d.weekday].name}`}
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={d.end}
                      onChange={(e) => updateDay(block._id, d.weekday, "end", e.target.value)}
                      aria-label={`Término — ${DAYS[d.weekday].name}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs font-normal text-muted-foreground">Vigência:</Label>
              <Input
                type="date"
                value={block.from}
                onChange={(e) => updateBlockRange(block._id, "from", e.target.value)}
                aria-label="Vigente desde"
                className="h-8"
              />
              <span className="shrink-0 text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={block.until}
                onChange={(e) => updateBlockRange(block._id, "until", e.target.value)}
                placeholder="Atual"
                aria-label="Vigente até"
                className="h-8"
              />
            </div>
          </div>
        );
      })}

      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum horário adicionado ainda.</p>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addBlock}>
        <Plus className="size-4" /> Adicionar horário
      </Button>
    </div>
  );
}
