import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = false,
  tone,
  href,
  compact = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: boolean;
  tone?: "warning" | "danger";
  href?: string;
  // Smaller padding/text — for a dense grid of many cards side by side
  // (e.g. a student's lesson-status breakdown) where the default size
  // meant for a handful of dashboard overview tiles wastes a lot of space.
  compact?: boolean;
}) {
  const card = (
    <Card
      className={cn(
        "gap-0",
        compact ? "py-3" : "py-5",
        tone === "warning" && "border-warning/40 bg-warning/5",
        tone === "danger" && "border-destructive/40 bg-destructive/5",
        href && "transition-colors hover:border-accent/50"
      )}
    >
      <CardContent className={cn("flex items-start justify-between", compact ? "px-3" : "px-5")}>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-1.5 font-semibold tracking-tight",
              compact ? "text-lg" : "text-2xl"
            )}
          >
            {value}
          </p>
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
            "flex shrink-0 items-center justify-center rounded-lg",
            compact ? "size-7" : "size-9",
            tone === "warning"
              ? "bg-warning/15 text-warning"
              : tone === "danger"
                ? "bg-destructive/15 text-destructive"
                : accent
                  ? "bg-accent/15 text-accent"
                  : "bg-secondary text-muted-foreground"
          )}
        >
          <Icon className={compact ? "size-3.5" : "size-4.5"} />
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
