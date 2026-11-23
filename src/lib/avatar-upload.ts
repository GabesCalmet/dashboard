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
