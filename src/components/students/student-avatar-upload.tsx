"use client";

import { AvatarUploadMenu } from "@/components/shared/avatar-upload-menu";
import { updateStudentAvatar } from "@/server/actions/students";

export function StudentAvatarUpload(props: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  editable: boolean;
}) {
  return (
    <AvatarUploadMenu {...props} ariaLabel="Alterar foto do aluno" onUploaded={updateStudentAvatar} />
  );
}
