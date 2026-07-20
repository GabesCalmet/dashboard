import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "@/components/users/users-table";
import { CreateStaffDialog } from "@/components/users/create-staff-dialog";
import { listAllUsers } from "@/server/queries/users";
import { requireUser } from "@/lib/auth";

export default async function AdminUsersPage() {
  const [users, currentUser] = await Promise.all([listAllUsers(), requireUser()]);

  return (
    <div>
      <PageHeader
        title="Usuários & Permissões"
        description="Gerencie o acesso de administradores e coordenadores ao portal."
        actions={<CreateStaffDialog />}
      />
      <UsersTable users={users} currentUserId={currentUser.id} />
    </div>
  );
}
