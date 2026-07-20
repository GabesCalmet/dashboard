import { requireUser } from "@/lib/auth";
import { SettingsPage } from "@/components/settings/settings-page";

export default async function StudentSettingsPage() {
  const user = await requireUser();
  return (
    <SettingsPage
      userId={user.id}
      name={user.name}
      email={user.email}
      phone={user.phone}
      avatarUrl={user.avatarUrl}
      role={user.role}
    />
  );
}
