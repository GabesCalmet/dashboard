import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { roleLabel } from "@/components/layout/nav-config";
import type { Role } from "@prisma/client";

export function SettingsPage({
  userId,
  name,
  email,
  phone,
  avatarUrl,
  role,
}: {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: Role;
}) {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Configurações" description={`Conta de ${roleLabel[role]}`} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>{email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <AvatarUploader userId={userId} name={name} avatarUrl={avatarUrl} />
            <ProfileForm name={name} phone={phone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Altere sua senha de acesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
