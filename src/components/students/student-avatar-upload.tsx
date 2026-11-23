"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, ClipboardPaste, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  uploadAvatarImage,
  getImageFromClipboard,
  readImageFromClipboard,
} from "@/lib/avatar-upload";
import { updateStudentAvatar } from "@/server/actions/students";

// Clicking the avatar itself (rather than a separate "Alterar foto"
// button, as in the settings page's own AvatarUploader) opens the file
// picker — only wired up when the viewer can edit this student at all,
// otherwise it's the same plain avatar as before. A small "Colar imagem"
// button underneath is the actual discoverable way to paste a copied
// image; Ctrl+V while the avatar itself has focus also still works, as a
// bonus for anyone who already knows that shortcut, but it's easy to
// miss on its own.
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

  async function handlePasteClick() {
    startTransition(async () => {
      const result = await readImageFromClipboard();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      await handleFile(result.file);
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
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
        title="Clique para enviar uma foto"
        className="group relative block rounded-full"
      >
        {avatar}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
          {isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </span>
      </button>
      <button
        type="button"
        onClick={handlePasteClick}
        disabled={isPending}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        <ClipboardPaste className="size-3" /> Colar imagem
      </button>
    </div>
  );
}
