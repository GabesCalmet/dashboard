"use client";

import { AvatarUploadMenu } from "@/components/shared/avatar-upload-menu";
import { updateTeacherAvatar } from "@/server/actions/teachers";

export function TeacherAvatarUpload(props: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  editable: boolean;
}) {
  return (
    <AvatarUploadMenu {...props} ariaLabel="Alterar foto do professor" onUploaded={updateTeacherAvatar} />
  );
}
