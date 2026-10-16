"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatCalendarMonthYear } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { BankLedgerItem } from "@/server/queries/financial";

type MonthGroup = { key: string; label: string; items: BankLedgerItem[]; total: number };

// Buckets an already newest-first list into one group per calendar month
// (UTC, matching how every item.date was built server-side) — items come
// in pre-sorted, so this just inserts a boundary wherever the month
// changes rather than re-sorting anything.
function groupByMonth(items: BankLedgerItem[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const item of items) {
    const d = new Date(item.date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      group = { key, label: formatCalendarMonthYear(item.date), items: [], total: 0 };
      groups.push(group);
    }
    group.items.push(item);
    group.total += item.amount;
  }
  return groups;
}

function ItemColumn({
  group,
  tone,
}: {
  group: MonthGroup | undefined;
  tone: "success" | "destructive";
}) {
  if (!group || group.items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada neste mês.</p>;
  }
  return (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {group.items.map((item) => (
        <div
          key={item.id}
          className="mb-2 flex items-center justify-between gap-3 break-inside-avoid text-sm"
        >
          <div className="min-w-0">
            <p className={cn("truncate", item.manual && "text-blue-600 dark:text-blue-400")}>
              {item.label}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(new Date(item.date))}</p>
          </div>
          <span
            className={cn(
              "shrink-0 font-medium",
              item.manual
                ? "text-blue-600 dark:text-blue-400"
                : tone === "success"
                  ? "text-success"
                  : "text-destructive"
            )}
          >
            {formatCurrency(item.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Click-to-expand version of a "Saldo por conta bancária" box — the card
// itself still shows just the totals, but opens a dialog listing every
// individual entrada/saída that adds up to them. Shows one month at a
// time (prev/next, newest first) with Entradas and Saídas laid out side
// by side, each flowing into multiple columns, so a typical month's worth
// of entries fits in view without scrolling — easier to cross-check
// against an outside spreadsheet than one long mixed, all-months list.
export function BankAccountCard({
  label,
  balance,
  received,
  spent,
  receivedItems,
  spentItems,
}: {
  label: string;
  balance: number;
  received: number;
  spent: number;
  receivedItems: BankLedgerItem[];
  spentItems: BankLedgerItem[];
}) {
  const [open, setOpen] = useState(false);
  const [monthIndex, setMonthIndex] = useState(0);

  const receivedByMonth = useMemo(() => groupByMonth(receivedItems), [receivedItems]);
  const spentByMonth = useMemo(() => groupByMonth(spentItems), [spentItems]);
  // Union of every month either list has an entry in, newest first —
  // either list can have a month the other doesn't.
  const months = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const g of receivedByMonth) byKey.set(g.key, g.label);
    for (const g of spentByMonth) byKey.set(g.key, g.label);
    return Array.from(byKey.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [receivedByMonth, spentByMonth]);

  const current = months[monthIndex];
  const receivedGroup = current ? receivedByMonth.find((g) => g.key === current.key) : undefined;
  const spentGroup = current ? spentByMonth.find((g) => g.key === current.key) : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMonthIndex(0);
          setOpen(true);
        }}
        className="rounded-lg border p-4 text-left transition-colors hover:border-accent/50 hover:bg-secondary/50"
      >
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-lg font-semibold">{formatCurrency(balance)}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(received)} recebido − {formatCurrency(spent)} gasto
        </p>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[92vh] max-h-[92vh] w-[95vw] max-w-[1600px] flex-col overflow-hidden sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {formatCurrency(received)} recebido − {formatCurrency(spent)} gasto = {formatCurrency(balance)}
            </DialogDescription>
          </DialogHeader>

          {months.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={monthIndex >= months.length - 1}
                  onClick={() => setMonthIndex((i) => Math.min(i + 1, months.length - 1))}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-40 text-center text-sm font-semibold capitalize">
                  {current?.label}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={monthIndex <= 0}
                  onClick={() => setMonthIndex((i) => Math.max(i - 1, 0))}
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between border-b pb-2">
                    <p className="text-base font-semibold tracking-wide text-muted-foreground uppercase">
                      Entradas ({receivedGroup?.items.length ?? 0})
                    </p>
                    <p className="text-lg font-bold text-success">
                      {formatCurrency(receivedGroup?.total ?? 0)}
                    </p>
                  </div>
                  <ItemColumn group={receivedGroup} tone="success" />
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between border-b pb-2">
                    <p className="text-base font-semibold tracking-wide text-muted-foreground uppercase">
                      Saídas ({spentGroup?.items.length ?? 0})
                    </p>
                    <p className="text-lg font-bold text-destructive">
                      {formatCurrency(spentGroup?.total ?? 0)}
                    </p>
                  </div>
                  <ItemColumn group={spentGroup} tone="destructive" />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
