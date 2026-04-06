/**
 * Réduit la taille des images avant upload (JPEG, qualité adaptative).
 * Utilise un canvas ; ne traite pas les SVG.
 */
export async function compressImageFileToJpeg(
  file: File,
  options?: { maxEdge?: number; minQuality?: number; maxBytes?: number }
): Promise<Blob> {
  const maxEdge = options?.maxEdge ?? 1920;
  const minQuality = options?.minQuality ?? 0.72;
  const maxBytes = options?.maxBytes ?? 1_200_000;

  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    return file;
  }

  try {
    let { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let quality = 0.88;
    let blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );

    while (blob && blob.size > maxBytes && quality > minQuality) {
      quality -= 0.06;
      blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
      );
    }

    if (blob && blob.size < file.size) {
      return blob;
    }
    return blob ?? file;
  } catch {
    bitmap.close?.();
    return file;
  }
}
