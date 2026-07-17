import { createClient } from "./supabase/client";

export const PROFILE_IMAGES_BUCKET = "profile-images";
export const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "OC";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function profileImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  const supabase = createClient();
  return supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadProfileImage(file: File, previousPath?: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente.");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}/profile-${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw new Error("Não foi possível enviar a imagem.");
  if (previousPath) {
    await supabase.storage.from(PROFILE_IMAGES_BUCKET).remove([previousPath]);
  }
  return path;
}

export async function removeProfileImage(path?: string): Promise<void> {
  if (!path) return;
  const supabase = createClient();
  const { error } = await supabase.storage.from(PROFILE_IMAGES_BUCKET).remove([path]);
  if (error) throw new Error("Não foi possível remover a imagem.");
}
