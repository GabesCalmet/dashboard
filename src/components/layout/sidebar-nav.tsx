"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/nav-config";

export function SidebarNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-4.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Upfront Portal</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/coordinator" &&
              item.href !== "/teacher" &&
              item.href !== "/student" &&
              pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-4 mt-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
        <p className="text-xs font-medium text-sidebar-foreground">Upfront English School</p>
        <p className="mt-0.5 text-[11px] text-sidebar-foreground/60">
          Portal de gestão acadêmica
        </p>
      </div>
    </div>
  );
}
