import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: boolean;
}) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex items-start justify-between px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend.positive ? "text-success" : "text-muted-foreground"
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            accent ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
