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
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: boolean;
  tone?: "warning" | "danger";
  href?: string;
}) {
  const card = (
    <Card
      className={cn(
        "gap-0 py-5",
        tone === "warning" && "border-warning/40 bg-warning/5",
        tone === "danger" && "border-destructive/40 bg-destructive/5",
        href && "transition-colors hover:border-accent/50"
      )}
    >
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
            tone === "warning"
              ? "bg-warning/15 text-warning"
              : tone === "danger"
                ? "bg-destructive/15 text-destructive"
                : accent
                  ? "bg-accent/15 text-accent"
                  : "bg-secondary text-muted-foreground"
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
