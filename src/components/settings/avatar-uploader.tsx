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
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

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
