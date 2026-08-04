import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );

  return (
    <div className="flex items-center gap-2">
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
    </div>
  );
}
