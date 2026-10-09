"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/labels";
import type { BankLedgerItem } from "@/server/queries/financial";

// Click-to-expand version of a "Saldo por conta bancária" box — the card
// itself still shows just the totals, but opens a dialog listing every
// individual entrada/saída that adds up to them.
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border p-4 text-left transition-colors hover:border-accent/50 hover:bg-secondary/50"
      >
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-lg font-semibold">{formatCurrency(balance)}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(received)} recebido − {formatCurrency(spent)} gasto
        </p>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {formatCurrency(received)} recebido − {formatCurrency(spent)} gasto = {formatCurrency(balance)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Entradas ({receivedItems.length})
              </p>
              {receivedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma entrada registrada.</p>
              ) : (
                <div className="space-y-1.5">
                  {receivedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(new Date(item.date))}</p>
                      </div>
                      <span className="shrink-0 font-medium text-success">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Saídas ({spentItems.length})
              </p>
              {spentItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma saída registrada.</p>
              ) : (
                <div className="space-y-1.5">
                  {spentItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(new Date(item.date))}</p>
                      </div>
                      <span className="shrink-0 font-medium text-destructive">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
