"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const TIME_SLOTS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

// Drop-in replacement for <input type="time"> that always displays and is
// typed in 24-hour HH:MM (Brazilian convention), regardless of the
// browser/OS locale — a native time input can render a 12-hour AM/PM
// picker depending on locale, the same class of ambiguity DateInput
// already fixes for dates. Also offers a scrollable dropdown of 15min
// slots for anyone who'd rather pick than type — losing that affordance
// was the actual regression when the native input was first dropped, not
// the typed format itself. The underlying value is already the same
// locale-independent "HH:mm" string every existing consumer expects, so
// no format conversion is needed — this only changes how it's typed and
// displayed.
export function TimeInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string; // "HH:mm" — controlled when provided
  defaultValue?: string; // "HH:mm" — uncontrolled initial value
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const timeValue = isControlled ? (value ?? "") : uncontrolledValue;

  const [text, setText] = useState(timeValue);
  // Adjusted during render (not a useEffect) whenever the resolved value
  // changes from outside a keystroke — see date-input.tsx for why.
  const [syncedValue, setSyncedValue] = useState(timeValue);
  if (timeValue !== syncedValue) {
    setSyncedValue(timeValue);
    setText(timeValue);
  }

  const [open, setOpen] = useState(false);

  function applyValue(next: string) {
    setSyncedValue(next);
    setText(next);
    if (!isControlled) setUncontrolledValue(next);
    onChange?.(next);
  }

  function handleTextChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    setText(formatted);

    let next = "";
    if (digits.length === 4) {
      const hours = Number(digits.slice(0, 2));
      const minutes = Number(digits.slice(2, 4));
      if (hours <= 23 && minutes <= 59) next = formatted;
    }
    setSyncedValue(next);
    if (!isControlled) setUncontrolledValue(next);
    onChange?.(next);
  }

  function scrollToSelected(node: HTMLButtonElement | null) {
    if (node) node.scrollIntoView({ block: "center" });
  }

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH:MM"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={cn("pr-9", className)}
        aria-label={ariaLabel}
        maxLength={5}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute top-0 right-0 size-9 text-muted-foreground hover:text-foreground"
            aria-label="Abrir lista de horários"
          >
            <Clock className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-h-64 w-28 overflow-y-auto p-1" align="start">
          <div className="flex flex-col gap-0.5">
            {TIME_SLOTS.map((slot) => (
              <Button
                key={slot}
                ref={slot === timeValue ? scrollToSelected : undefined}
                type="button"
                variant={slot === timeValue ? "default" : "ghost"}
                size="sm"
                className="justify-center"
                onClick={() => {
                  applyValue(slot);
                  setOpen(false);
                }}
              >
                {slot}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
