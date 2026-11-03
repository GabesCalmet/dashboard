"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { monthParam } from "@/lib/month-param";

export function MonthNav({
  basePath,
  year,
  month,
}: {
  basePath: string;
  year: number;
  month: number;
}) {
  const router = useRouter();
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" asChild>
        <Link href={`${basePath}?month=${monthParam(prev.getFullYear(), prev.getMonth())}`}>
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <span className="min-w-40 text-center text-sm font-medium capitalize">{label}</span>
      <Button variant="outline" size="icon" asChild>
        <Link href={`${basePath}?month=${monthParam(next.getFullYear(), next.getMonth())}`}>
          <ChevronRight className="size-4" />
        </Link>
      </Button>
      {/* Jumps straight to any month instead of clicking through one at a
          time — same "pick a month" convenience the Histórico de aulas
          table already has. */}
      <Input
        type="month"
        value={monthParam(year, month)}
        onChange={(e) => e.target.value && router.push(`${basePath}?month=${e.target.value}`)}
        // w-40 clipped the native calendar icon on some browsers/devices —
        // a long localized month name like "novembro de 2026" plus the
        // icon needs more room than that.
        className="w-48"
        aria-label="Ir para o mês"
      />
    </div>
  );
}
