"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadAvatarImage } from "@/lib/avatar-upload";
import { updateStudentAvatar } from "@/server/actions/students";

// On desktop, clicking the avatar jumps straight to the file picker —
// there's only ever one real choice there. On a phone there's an actual
// decision to make, so it opens a small menu instead: Enviar foto (the
// same plain file picker), Tirar foto (opens the camera directly, via a
// second file input with capture="environment" — desktop browsers ignore
// that attribute, which is why it's phone-only), and Acessar galeria
// (the same picker as Enviar foto, as its own clearly-labeled entry).
// Only wired up at all when the viewer can edit this student; otherwise
// it's the same plain avatar as before.
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
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    // Classic SSR-safe client-only check: server and the first client
    // render must match, so the real value can only be known once
    // mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

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

  const triggerButton = (
    <button
      type="button"
      disabled={isPending}
      aria-label="Alterar foto do aluno"
      className="group relative block rounded-full"
    >
      {avatar}
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
        {isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
      </span>
    </button>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {isMobile ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
              <Upload /> Enviar foto
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => cameraInputRef.current?.click()}>
              <Camera /> Tirar foto
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
              <ImageIcon /> Acessar galeria
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span onClick={() => fileInputRef.current?.click()}>{triggerButton}</span>
      )}
    </>
  );
}
