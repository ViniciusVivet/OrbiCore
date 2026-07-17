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

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem.")),
      "image/webp",
      quality
    );
  });
}

export async function optimizeImage(
  source: File,
  options: OptimizeOptions
): Promise<OptimizedImage> {
  const maxInputBytes = options.maxInputBytes ?? 10 * 1024 * 1024;
  if (!source.type.startsWith("image/")) {
    throw new Error("Escolha uma foto nos formatos JPG, PNG ou WebP.");
  }
  if (source.size > maxInputBytes) {
    throw new Error("A foto original deve ter no máximo 10 MB.");
  }

  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, options.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Seu navegador não conseguiu preparar a foto.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > options.targetBytes && quality > 0.46) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }
  if (blob.size > options.maxBytes) {
    throw new Error("A foto continuou muito pesada após a otimização. Tente outra imagem.");
  }

  const baseName = source.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "imagem";
  return {
    file: new File([blob], `${baseName}.webp`, { type: "image/webp" }),
    originalBytes: source.size,
    optimizedBytes: blob.size,
    width,
    height,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
