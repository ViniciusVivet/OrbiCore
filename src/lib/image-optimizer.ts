export interface OptimizedImage {
  file: File;
  originalBytes: number;
  optimizedBytes: number;
  width: number;
  height: number;
}

interface OptimizeOptions {
  maxDimension: number;
  targetBytes: number;
  maxBytes: number;
  maxInputBytes?: number;
}

// Aceitamos fotos grandes na entrada (câmeras de celular geram 5–20 MB fácil).
// Poucos usuários no início, então o Supabase free aguenta de sobra.
const DEFAULT_MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MIN_DIMENSION = 420;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem.")),
      "image/webp",
      quality
    );
  });
}

function drawToCanvas(bitmap: ImageBitmap, dimension: number): { canvas: HTMLCanvasElement; width: number; height: number } {
  const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu preparar a foto.");
  context.drawImage(bitmap, 0, 0, width, height);
  return { canvas, width, height };
}

export async function optimizeImage(
  source: File,
  options: OptimizeOptions
): Promise<OptimizedImage> {
  const maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES;
  if (!source.type.startsWith("image/")) {
    throw new Error("Escolha uma foto nos formatos JPG, PNG ou WebP.");
  }
  if (source.size > maxInputBytes) {
    throw new Error(`A foto original deve ter no máximo ${Math.round(maxInputBytes / (1024 * 1024))} MB.`);
  }

  const bitmap = await createImageBitmap(source);
  try {
    let dimension = options.maxDimension;
    let best: { blob: Blob; width: number; height: number } | null = null;

    // Vai reduzindo dimensão e qualidade até caber no limite — assim
    // praticamente nunca falha por "foto grande demais".
    for (let attempt = 0; attempt < 8; attempt++) {
      const { canvas, width, height } = drawToCanvas(bitmap, dimension);
      let quality = 0.82;
      let blob = await canvasToBlob(canvas, quality);
      while (blob.size > options.targetBytes && quality > 0.4) {
        quality -= 0.08;
        blob = await canvasToBlob(canvas, quality);
      }
      if (!best || blob.size < best.blob.size) best = { blob, width, height };
      if (blob.size <= options.maxBytes) break;
      if (Math.max(width, height) <= MIN_DIMENSION) break;
      dimension = Math.max(MIN_DIMENSION, Math.round(dimension * 0.8));
    }

    if (!best || best.blob.size > options.maxBytes) {
      throw new Error("Não foi possível otimizar essa imagem. Tente outra foto.");
    }

    const baseName = source.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "imagem";
    return {
      file: new File([best.blob], `${baseName}.webp`, { type: "image/webp" }),
      originalBytes: source.size,
      optimizedBytes: best.blob.size,
      width: best.width,
      height: best.height,
    };
  } finally {
    bitmap.close();
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
