/**
 * Réduit la résolution avant l’éditeur de recadrage : évite de charger des photos 12+ Mpx
 * en data URL / dans le DOM (lenteur forte sur mobile).
 */
const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.86;

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Retourne une data URL JPEG redimensionnée (côté max ≤ MAX_EDGE_PX), prête pour ImageCropEditor.
 */
export async function prepareImageForProfileCrop(input: File | string): Promise<string> {
  const blob =
    typeof input === "string"
      ? await dataUrlToBlob(input)
      : input;
  const file =
    blob instanceof File
      ? blob
      : new File([blob], "image.jpg", { type: blob.type || "image/jpeg" });

  let bitmap: ImageBitmap | null = null;
  let w = 0;
  let h = 0;
  let drawScaled: (ctx: CanvasRenderingContext2D, dw: number, dh: number) => void;
  let releaseBitmap: (() => void) | undefined;

  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file);
      w = bitmap.width;
      h = bitmap.height;
      drawScaled = (ctx, dw, dh) => ctx.drawImage(bitmap!, 0, 0, dw, dh);
      releaseBitmap = () => bitmap!.close();
    } catch {
      bitmap = null;
    }
  }

  if (!bitmap) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = url;
    });
    URL.revokeObjectURL(url);
    w = img.naturalWidth;
    h = img.naturalHeight;
    drawScaled = (ctx, dw, dh) => ctx.drawImage(img, 0, 0, dw, dh);
  }

  if (w < 1 || h < 1) {
    releaseBitmap?.();
    throw new Error("Invalid image dimensions");
  }

  const maxDim = Math.max(w, h);
  const scale = maxDim > MAX_EDGE_PX ? MAX_EDGE_PX / maxDim : 1;
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    releaseBitmap?.();
    throw new Error("No 2d context");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  try {
    drawScaled(ctx, outW, outH);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    releaseBitmap?.();
  }
}
