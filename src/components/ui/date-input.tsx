"use client";

import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// A date no one has a real year for (a birthday nobody wrote down the
// year of) still needs *some* year to form a valid Date — 2000 is a leap
// year, so 29/02 is never rejected. Only ever used when yearOptional and
// exactly the day+month were typed; picking from the calendar always
// implies a real year, and typing all 8 digits always overrides it.
const PARTIAL_DATE_YEAR = 2000;

// Drop-in replacement for <input type="date"> that always displays and is
// typed in Brazilian dd/mm/aaaa order, regardless of the browser/OS locale
// — a native date input renders in whatever order the locale dictates
// (often month-first), and editing just one segment of that picker without
// noticing the others didn't change is an easy, hard-to-spot mistake (this
// is exactly what produced a wrong "vigência" date once). Also offers a
// calendar popup (click a day, no segment to get wrong) for anyone who'd
// rather point-and-click — losing that affordance was the actual
// regression when the native input was first dropped, not the typed
// format itself. Still stores and submits the same ISO yyyy-mm-dd string
// every existing consumer already expects — via a hidden input sharing
// `name` for uncontrolled/form-submitted usage, or via onChange(isoValue)
// for controlled usage.
//
// yearOptional (e.g. a birthday, where many parents don't know the exact
// year) lets typing just 4 digits (dd/MM) count as a complete, valid
// value instead of requiring all 8 — stored with PARTIAL_DATE_YEAR and a
// companion hidden input (name + "YearUnknown", "true"/"false") so the
// form submission carries both the date and whether its year is real.
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
  yearOptional = false,
  defaultYearUnknown = false,
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
  yearOptional?: boolean;
  defaultYearUnknown?: boolean;
}) {
  const isControlled = value !== undefined;
  const [uncontrolledIso, setUncontrolledIso] = useState(defaultValue ?? "");
  const isoValue = isControlled ? (value ?? "") : uncontrolledIso;

  const [yearUnknown, setYearUnknown] = useState(defaultYearUnknown);
  const [text, setText] = useState(() => isoToDisplay(isoValue, yearUnknown));
  // Keeps the displayed text in sync whenever the resolved ISO value
  // changes from outside a keystroke (a new `value` prop, or the dialog
  // showing a different record) — adjusted during render per React's
  // guidance instead of a useEffect, since a useEffect here would fire
  // one render late and briefly clobber whatever the user just typed.
  const [syncedIso, setSyncedIso] = useState(isoValue);
  if (isoValue !== syncedIso) {
    setSyncedIso(isoValue);
    setText(isoToDisplay(isoValue, yearUnknown));
  }

  const [open, setOpen] = useState(false);

  function applyIso(iso: string) {
    setSyncedIso(iso);
    setYearUnknown(false);
    setText(isoToDisplay(iso, false));
    if (!isControlled) setUncontrolledIso(iso);
    onChange?.(iso);
  }

  function handleTextChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(formatted);

    let iso = "";
    let unknown = false;
    if (digits.length === 8) {
      const parsed = parse(formatted, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) iso = format(parsed, "yyyy-MM-dd");
    } else if (yearOptional && digits.length === 4) {
      const parsed = parse(`${formatted}/${PARTIAL_DATE_YEAR}`, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        iso = format(parsed, "yyyy-MM-dd");
        unknown = true;
      }
    }
    setSyncedIso(iso);
    setYearUnknown(unknown);
    if (!isControlled) setUncontrolledIso(iso);
    onChange?.(iso);
  }

  function handleCalendarSelect(day: Date | undefined) {
    if (day) applyIso(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }

  const selectedDate = isoToDate(isoValue);

  return (
    <div className="relative">
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
        className={cn("pr-9", className)}
        aria-label={ariaLabel}
        maxLength={10}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute top-0 right-0 size-9 text-muted-foreground hover:text-foreground"
            aria-label="Abrir calendário"
          >
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            defaultMonth={selectedDate}
          />
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={isoValue} />}
      {yearOptional && name && (
        <input type="hidden" name={`${name}YearUnknown`} value={yearUnknown ? "true" : "false"} />
      )}
    </div>
  );
}

function isoToDisplay(iso: string, yearUnknown: boolean) {
  const parsed = isoToDate(iso);
  return parsed ? format(parsed, yearUnknown ? "dd/MM" : "dd/MM/yyyy") : "";
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parsed = parse(iso.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}
