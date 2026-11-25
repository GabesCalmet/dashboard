"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// A "jump to any month" picker — same job as a native <input type="month">,
// but that renders its own text in the browser/OS's locale (an English
// "October 2026" button next to an otherwise all-Portuguese page), which
// can't be forced into pt-BR from HTML/CSS alone. Same reasoning DateInput
// already replaced the native date input for.
export function MonthInput({
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Ir para o mês",
}: {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, selectedMonth] = value.split("-").map(Number);
  const [draftYear, setDraftYear] = useState(year);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraftYear(year);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={ariaLabel}
          className={cn("shrink-0", className)}
        >
          <CalendarIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Ano anterior"
            onClick={() => setDraftYear((y) => y - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">{draftYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Próximo ano"
            onClick={() => setDraftYear((y) => y + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_ABBR.map((label, i) => {
            const isSelected = draftYear === year && i + 1 === selectedMonth;
            return (
              <Button
                key={label}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  onChange(`${draftYear}-${String(i + 1).padStart(2, "0")}`);
                  setOpen(false);
                }}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
