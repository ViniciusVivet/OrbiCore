import { createClient } from "./supabase/client";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGES = 3;

export function productImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return createClient().storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente.");

  const path = `${user.id}/${productId}/product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "86400", upsert: false });
  if (error) throw new Error("Não foi possível enviar a foto do produto.");
  return path;
}

export async function removeProductImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  if (error) throw new Error("Não foi possível remover a foto do produto.");
}
