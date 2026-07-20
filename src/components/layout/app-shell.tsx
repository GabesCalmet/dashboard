import type { Notification, Role } from "@prisma/client";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { GlobalSearch } from "@/components/layout/global-search";
import { navByRole } from "@/components/layout/nav-config";

export function AppShell({
  user,
  notifications,
  children,
}: {
  user: {
    name: string;
    email: string;
    role: Role;
    avatarUrl?: string | null;
  };
  notifications: Notification[];
  children: React.ReactNode;
}) {
  const items = navByRole[user.role];
  const settingsHref = items.find((i) => i.label === "Configurações")?.href ?? "/";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <div className="fixed h-screen w-64">
          <SidebarNav items={items} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
          <MobileSidebar items={items} />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationsBell notifications={notifications} />
            <ThemeToggle />
            <UserMenu
              name={user.name}
              email={user.email}
              role={user.role}
              avatarUrl={user.avatarUrl}
              settingsHref={settingsHref}
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
