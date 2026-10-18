"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CalendarClock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { setCobrancaStatus } from "@/server/actions/payments";
import { paymentStatusLabel } from "@/lib/labels";
import { toBrazilDateString } from "@/lib/timezone";
import type { PaymentStatus } from "@prisma/client";

// paidAt is already a date-only value (UTC midnight for its calendar
// day), so it's read back with a plain slice. A missing paidAt falls back
// to Brazil's today — not a plain new Date().toISOString() slice, which
// rolls over to tomorrow's UTC day a few hours early every evening.
function toIsoDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : toBrazilDateString(new Date());
}

// Marking Pago always stamps "now" automatically by default — no extra
// step for the common case. The small calendar button (shown only once
// Pago is selected) is the exception path: it opens just a date field, for
// correcting the payment date when confirming something that actually
// happened earlier than the moment it's being registered.
export function PaymentStatusSelect({
  studentId,
  payerName,
  status,
  paidAt,
  referenceMonth,
}: {
  studentId: string;
  payerName: string | null;
  status: PaymentStatus;
  paidAt: Date | null;
  referenceMonth: Date;
}) {
  const [isPending, startTransition] = useTransition();
  const [dateOpen, setDateOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState(() => toIsoDate(paidAt));

  function updateStatus(value: PaymentStatus, paidAtOverride?: Date) {
    startTransition(async () => {
      try {
        await setCobrancaStatus(studentId, payerName, value, referenceMonth, paidAtOverride);
        toast.success("Status do pagamento atualizado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Select
        value={status}
        disabled={isPending}
        onValueChange={(value) => updateStatus(value as PaymentStatus)}
      >
        <SelectTrigger size="sm" className="w-[130px]">
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {Object.entries(paymentStatusLabel).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {status === "PAID" && (
        <Popover
          open={dateOpen}
          onOpenChange={(open) => {
            setDateOpen(open);
            if (open) setDateDraft(toIsoDate(paidAt));
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Editar data do pagamento"
              disabled={isPending}
            >
              <CalendarClock className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto space-y-2 p-3" align="start">
            <p className="text-xs text-muted-foreground">Data do pagamento</p>
            <DateInput value={dateDraft} onChange={setDateDraft} />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={isPending}
              onClick={() => {
                updateStatus("PAID", new Date(dateDraft));
                setDateOpen(false);
              }}
            >
              Salvar
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
