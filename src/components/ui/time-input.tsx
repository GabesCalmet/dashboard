"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

// Drop-in replacement for <input type="time"> that always displays and is
// typed in 24-hour HH:MM (Brazilian convention), regardless of the
// browser/OS locale — a native time input can render a 12-hour AM/PM
// picker depending on locale, the same class of ambiguity DateInput
// already fixes for dates. The underlying value is already the same
// locale-independent "HH:mm" string every existing consumer expects, so
// no format conversion is needed here — this only changes how it's typed
// and displayed.
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

  return (
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
      className={className}
      aria-label={ariaLabel}
      maxLength={5}
    />
  );
}
