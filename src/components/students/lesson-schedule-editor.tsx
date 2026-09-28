"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Flat shape persisted to the DB — one row per weekday/time; a weekday can
// appear more than once (e.g. two separate classes on the same Monday).
// from/until (both optional) scope when that specific entry is in effect:
// undefined means "since enrollment" / "still ongoing". Entries sharing the
// same from/until are grouped back into one visual block when the editor
// loads.
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

type BlockDay = { _id: number; weekday: number; start: string; end: string };
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
    block.days.push({ _id: nextId++, weekday: e.weekday, start: e.start, end: e.end });
  }
  return [...groups.values()];
}

// Groups a block's days by weekday, keeping weekday order and each
// weekday's own slots in insertion order — so a second same-day class
// added later renders right under the first instead of jumping elsewhere.
function groupByWeekday(days: BlockDay[]): [number, BlockDay[]][] {
  const groups = new Map<number, BlockDay[]>();
  for (const d of days) {
    const list = groups.get(d.weekday) ?? [];
    list.push(d);
    groups.set(d.weekday, list);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
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

  // Toggling a weekday circle on adds its first time slot; toggling it off
  // removes every slot that day has (including any extra ones added below).
  function toggleDay(blockId: number, weekday: number) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b._id !== blockId) return b;
        const exists = b.days.some((d) => d.weekday === weekday);
        const days = exists
          ? b.days.filter((d) => d.weekday !== weekday)
          : [...b.days, { _id: nextId++, weekday, start: "", end: "" }].sort(
              (a, c) => a.weekday - c.weekday
            );
        return { ...b, days };
      })
    );
  }

  // Adds another time slot for a weekday that already has at least one —
  // e.g. a student with back-to-back classes the same day.
  function addTimeSlot(blockId: number, weekday: number) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b._id !== blockId) return b;
        const days = [...b.days];
        let insertAt = days.length;
        for (let i = days.length - 1; i >= 0; i--) {
          if (days[i].weekday === weekday) {
            insertAt = i + 1;
            break;
          }
        }
        days.splice(insertAt, 0, { _id: nextId++, weekday, start: "", end: "" });
        return { ...b, days };
      })
    );
  }

  function removeTimeSlot(blockId: number, dayId: number) {
    setBlocks((prev) =>
      prev.map((b) => (b._id !== blockId ? b : { ...b, days: b.days.filter((d) => d._id !== dayId) }))
    );
  }

  function updateDay(blockId: number, dayId: number, field: "start" | "end", value: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b._id !== blockId
          ? b
          : { ...b, days: b.days.map((d) => (d._id === dayId ? { ...d, [field]: value } : d)) }
      )
    );
  }

  const schedule: ScheduleEntry[] = blocks.flatMap((b) =>
    b.days.map((d) => ({
      weekday: d.weekday,
      start: d.start,
      end: d.end,
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
                {groupByWeekday(block.days).map(([weekday, entries]) => (
                  <div key={weekday} className="space-y-2">
                    {entries.map((d, idx) => (
                      <div key={d._id} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-sm font-medium">
                          {idx === 0 ? DAYS[weekday].name : ""}
                        </span>
                        <TimeInput
                          value={d.start}
                          onChange={(v) => updateDay(block._id, d._id, "start", v)}
                          aria-label={`Início — ${DAYS[weekday].name}`}
                        />
                        <span className="shrink-0 text-sm text-muted-foreground">até</span>
                        <TimeInput
                          value={d.end}
                          onChange={(v) => updateDay(block._id, d._id, "end", v)}
                          aria-label={`Término — ${DAYS[weekday].name}`}
                        />
                        {idx === entries.length - 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => addTimeSlot(block._id, weekday)}
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
                            onClick={() => removeTimeSlot(block._id, d._id)}
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

            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs font-normal text-muted-foreground">Vigência:</Label>
              <DateInput
                value={block.from}
                onChange={(iso) => updateBlockRange(block._id, "from", iso)}
                aria-label="Vigente desde"
                className="h-8"
              />
              <span className="shrink-0 text-xs text-muted-foreground">até</span>
              <DateInput
                value={block.until}
                onChange={(iso) => updateBlockRange(block._id, "until", iso)}
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
