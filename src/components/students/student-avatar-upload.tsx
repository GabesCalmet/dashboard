"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadAvatarImage, getImageFromClipboard } from "@/lib/avatar-upload";
import { updateStudentAvatar } from "@/server/actions/students";

// Clicking the avatar itself (rather than a separate "Alterar foto"
// button, as in the settings page's own AvatarUploader) — only wired up
// to actually open the file picker when the viewer can edit this student
// at all; otherwise it's the same plain avatar as before. Also accepts a
// pasted image (Ctrl+V/Cmd+V) once the avatar has focus — clicking it to
// open the file picker, then cancelling, leaves it focused for exactly
// that.
export function StudentAvatarUpload({
  userId,
  name,
  avatarUrl,
  editable,
}: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  editable: boolean;
}) {
  const [preview, setPreview] = useState(avatarUrl ?? undefined);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    startTransition(async () => {
      const result = await uploadAvatarImage(userId, file);
      if ("error" in result) {
        toast.error("Erro ao enviar imagem: " + result.error);
        return;
      }

      setPreview(result.url);
      await updateStudentAvatar(userId, result.url);
      toast.success("Foto atualizada.");
      router.refresh();
    });
  }

  const avatar = (
    <Avatar className="size-16">
      {preview && <AvatarImage src={preview} />}
      <AvatarFallback className="text-lg">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );

  if (!editable) return avatar;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onPaste={(e) => {
          const file = getImageFromClipboard(e);
          if (file) handleFile(file);
        }}
        disabled={isPending}
        aria-label="Alterar foto do aluno"
        title="Clique para enviar uma foto, ou cole uma imagem (Ctrl+V)"
        className="group relative block rounded-full"
      >
        {avatar}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
          {isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </span>
      </button>
    </>
  );
}
