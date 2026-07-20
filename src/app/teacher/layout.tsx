import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getRecentNotifications } from "@/server/queries/notifications";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("TEACHER");
  const notifications = await getRecentNotifications(user.id);

  return (
    <AppShell user={user} notifications={notifications}>
      {children}
    </AppShell>
  );
}
