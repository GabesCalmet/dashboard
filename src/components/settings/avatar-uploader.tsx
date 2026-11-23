"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, ClipboardPaste, Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadAvatarImage, readImageFromClipboard } from "@/lib/avatar-upload";
import { updateProfile } from "@/server/actions/profile";

// "Alterar foto" opens a small menu — "Enviar foto" (file picker), "Colar
// imagem" (reads the clipboard directly), and, phone-only, "Tirar foto"
// (opens the camera via a second file input with capture="environment" —
// desktop browsers ignore that attribute, so there's no point showing it
// there).
export function AvatarUploader({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
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

      const formData = new FormData();
      formData.set("name", name);
      formData.set("avatarUrl", result.url);
      await updateProfile(undefined, formData);
      toast.success("Foto de perfil atualizada.");
      router.refresh();
    });
  }

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
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {preview && <AvatarImage src={preview} />}
        <AvatarFallback className="text-lg">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Camera />}
              Alterar foto
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
              <Upload /> Enviar foto
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handlePasteClick}>
              <ClipboardPaste /> Colar imagem
            </DropdownMenuItem>
            {isMobile && (
              <DropdownMenuItem onSelect={() => cameraInputRef.current?.click()}>
                <Camera /> Tirar foto
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
