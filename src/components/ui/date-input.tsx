"use client";

import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { Input } from "@/components/ui/input";

// Drop-in replacement for <input type="date"> that always displays and is
// typed in Brazilian dd/mm/aaaa order, regardless of the browser/OS locale
// — a native date input renders in whatever order the locale dictates
// (often month-first), and editing just one segment of that picker without
// noticing the others didn't change is an easy, hard-to-spot mistake (this
// is exactly what produced a wrong "vigência" date once). Still stores and
// submits the same ISO yyyy-mm-dd string every existing consumer already
// expects — via a hidden input sharing `name` for uncontrolled/
// form-submitted usage, or via onChange(isoValue) for controlled usage.
export function DateInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  placeholder = "DD/MM/AAAA",
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string; // ISO yyyy-mm-dd — controlled when provided
  defaultValue?: string; // ISO yyyy-mm-dd — uncontrolled initial value
  onChange?: (isoValue: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const isControlled = value !== undefined;
  const [uncontrolledIso, setUncontrolledIso] = useState(defaultValue ?? "");
  const isoValue = isControlled ? (value ?? "") : uncontrolledIso;

  const [text, setText] = useState(() => isoToDisplay(isoValue));
  // Keeps the displayed text in sync whenever the resolved ISO value
  // changes from outside a keystroke (a new `value` prop, or the dialog
  // showing a different record) — adjusted during render per React's
  // guidance instead of a useEffect, since a useEffect here would fire
  // one render late and briefly clobber whatever the user just typed.
  const [syncedIso, setSyncedIso] = useState(isoValue);
  if (isoValue !== syncedIso) {
    setSyncedIso(isoValue);
    setText(isoToDisplay(isoValue));
  }

  function handleTextChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(formatted);

    let iso = "";
    if (digits.length === 8) {
      const parsed = parse(formatted, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) iso = format(parsed, "yyyy-MM-dd");
    }
    setSyncedIso(iso);
    if (!isControlled) setUncontrolledIso(iso);
    onChange?.(iso);
  }

  return (
    <>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
        maxLength={10}
      />
      {name && <input type="hidden" name={name} value={isoValue} />}
    </>
  );
}

function isoToDisplay(iso: string) {
  if (!iso) return "";
  const parsed = parse(iso.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy") : "";
}
