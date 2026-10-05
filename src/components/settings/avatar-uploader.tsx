"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/server/actions/profile";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    startTransition(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;

      // A timestamped filename here previously meant every re-upload left
      // the old file behind forever — nothing ever referenced it again,
      // but it kept sitting in the bucket as dead storage. Clearing out
      // whatever's already in this user's folder first (not just
      // overwriting `path` via upsert) also catches an extension change
      // (jpg -> png), which upsert alone wouldn't since that's a different
      // path.
      const { data: existing } = await supabase.storage.from("avatars").list(userId);
      if (existing && existing.length > 0) {
        await supabase.storage.from("avatars").remove(existing.map((f) => `${userId}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast.error("Erro ao enviar imagem: " + uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setPreview(data.publicUrl);

      const formData = new FormData();
      formData.set("name", name);
      formData.set("avatarUrl", data.publicUrl);
      await updateProfile(undefined, formData);
      toast.success("Foto de perfil atualizada.");
      router.refresh();
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
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Camera />}
          Alterar foto
        </Button>
      </div>
    </div>
  );
}
