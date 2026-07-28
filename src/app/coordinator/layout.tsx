import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getRecentNotifications } from "@/server/queries/notifications";

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("COORDINATOR");
  const notifications = await getRecentNotifications(user.id);

  return (
    <AppShell user={{ ...user, email: user.username ?? user.email ?? "" }} notifications={notifications}>
      {children}
    </AppShell>
  );
}
