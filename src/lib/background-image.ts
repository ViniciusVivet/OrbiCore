import { createClient } from "./supabase/client";
import { DashboardBackgrounds } from "./types";
import { DashboardView } from "./types";

export const BACKGROUND_IMAGES_BUCKET = "background-images";

export function backgroundImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return createClient().storage.from(BACKGROUND_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Resolve o papel de parede que vale para uma área específica. */
export function backgroundPathForView(
  backgrounds: DashboardBackgrounds | undefined,
  view: DashboardView
): string | undefined {
  if (!backgrounds) return undefined;
  if (backgrounds.scope === "area") return backgrounds[view];
  return backgrounds.all;
}

/** Todos os caminhos de imagem referenciados (para limpeza). */
export function allBackgroundPaths(backgrounds: DashboardBackgrounds | undefined): string[] {
  if (!backgrounds) return [];
  return [backgrounds.all, backgrounds.overview, backgrounds.commercial, backgrounds.store].filter(
    (path): path is string => Boolean(path)
  );
}

export async function uploadBackgroundImage(file: File, slot: string): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente.");

  const path = `${user.id}/bg-${slot}-${Date.now()}.webp`;
  const { error } = await supabase.storage
    .from(BACKGROUND_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "86400", upsert: false });
  if (error) throw new Error("Não foi possível enviar a imagem de fundo.");
  return path;
}

export async function removeBackgroundImages(paths: string[]): Promise<void> {
  const clean = paths.filter(Boolean);
  if (clean.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.storage.from(BACKGROUND_IMAGES_BUCKET).remove(clean);
  if (error) throw new Error("Não foi possível remover a imagem de fundo.");
}
