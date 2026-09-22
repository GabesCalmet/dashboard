"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const now = new Date();

export function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays
      captionLayout="dropdown"
      startMonth={new Date(now.getFullYear() - 100, 0)}
      endMonth={new Date(now.getFullYear() + 10, 11)}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-3",
        nav: "flex items-center justify-between absolute inset-x-1 top-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        month_caption: "flex justify-center items-center pt-1",
        // Each select (month, year) is rendered twice by the library: a
        // real, functional <select> (this "dropdown" class) and a
        // decorative visible span (the "caption_label" class below)
        // showing the current choice + a chevron. The real select is kept
        // fully sized but invisible, sitting on top of the decorative
        // label so clicking/tapping it still opens the native picker.
        dropdowns: "flex items-center justify-center gap-2",
        dropdown_root: "relative",
        dropdown: "absolute inset-0 z-10 cursor-pointer opacity-0",
        caption_label:
          "pointer-events-none inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm font-medium capitalize select-none",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 text-xs font-normal capitalize",
        week: "flex w-full mt-1",
        day: "size-9 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100"
        ),
        today: "bg-secondary text-secondary-foreground rounded-md",
        selected:
          "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:hover:bg-accent [&>button]:hover:opacity-90",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) => {
          if (orientation === "left") return <ChevronLeft className="size-4" {...rest} />;
          if (orientation === "down")
            return <ChevronDown className="size-3.5 text-muted-foreground" {...rest} />;
          return <ChevronRight className="size-4" {...rest} />;
        },
      }}
      {...props}
    />
  );
}
