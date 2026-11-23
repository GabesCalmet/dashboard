import type { ClipboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";

// Shared by every place a picture gets uploaded to someone's avatar — the
// signed-in user's own (Configurações) or, with permission, someone
// else's (e.g. an admin setting a student's photo from their cadastro).
// One file per user folder: clears out whatever's already there first
// (not just an upsert on a fixed filename), so a re-upload with a
// different extension (jpg -> png) doesn't leave the old file behind as
// dead storage.
export async function uploadAvatarImage(
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;

  const { data: existing } = await supabase.storage.from("avatars").list(userId);
  if (existing && existing.length > 0) {
    await supabase.storage.from("avatars").remove(existing.map((f) => `${userId}/${f.name}`));
  }

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}

// Pulls the first pasted image out of a clipboard event, if any — a copied
// screenshot or an image copied from a web page both land here as a
// File-like Blob, same shape as one picked from the file input. Only ever
// fires on a native Ctrl+V/Cmd+V while the right element happens to be
// focused — easy to miss, so this is the fallback, not the only path.
export function getImageFromClipboard(e: ClipboardEvent): File | null {
  const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
  return item?.getAsFile() ?? null;
}

// The explicit, click-a-button version — reads the clipboard directly via
// the Clipboard API instead of waiting for a paste keystroke, so there's
// an actual visible "Colar imagem" affordance rather than a hidden
// keyboard shortcut. Needs a real click to fire (browsers refuse
// clipboard.read() without one) and isn't supported everywhere (notably
// older Safari), hence the explicit error instead of failing silently.
export async function readImageFromClipboard(): Promise<{ file: File } | { error: string }> {
  if (!navigator.clipboard?.read) {
    return { error: "Este navegador não permite colar imagens diretamente. Use o upload de arquivo." };
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith("image/"));
      if (imageType) {
        const blob = await item.getType(imageType);
        return { file: new File([blob], "pasted-image", { type: imageType }) };
      }
    }
    return { error: "Nenhuma imagem encontrada na área de transferência." };
  } catch {
    return { error: "Não foi possível acessar a área de transferência." };
  }
}
