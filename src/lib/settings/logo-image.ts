const MAX_FILE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_SIDE = 256;
const DEFAULT_JPEG_QUALITY = 0.82;
const MAX_STORED_DATA_URL_CHARS = 320_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function hasAlphaChannel(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const sampleStep = Math.max(1, Math.floor(Math.max(width, height) / 64));
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 250) return true;
    }
  }
  return false;
}

function compressDataUrl(
  dataUrl: string,
  mime: string,
  maxSide = DEFAULT_MAX_SIDE,
  quality = DEFAULT_JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height, 1));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const keepPng = mime.includes("png") && hasAlphaChannel(ctx, width, height);
      const outputType = keepPng ? "image/png" : "image/jpeg";
      try {
        resolve(canvas.toDataURL(outputType, keepPng ? undefined : quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error("Invalid image file."));
    img.src = dataUrl;
  });
}

async function compressForStorage(dataUrl: string, mime: string): Promise<string> {
  let result = await compressDataUrl(dataUrl, mime, DEFAULT_MAX_SIDE, DEFAULT_JPEG_QUALITY);
  if (result.length <= MAX_STORED_DATA_URL_CHARS) return result;

  result = await compressDataUrl(dataUrl, "image/jpeg", 192, 0.72);
  if (result.length <= MAX_STORED_DATA_URL_CHARS) return result;

  result = await compressDataUrl(dataUrl, "image/jpeg", 128, 0.65);
  if (result.length <= MAX_STORED_DATA_URL_CHARS) return result;

  throw new Error("Image is too large after compression. Try a smaller file.");
}

export async function readLogoDataUrl(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Image must be under 8 MB.");
  }
  const dataUrl = await readFileAsDataUrl(file);
  return compressForStorage(dataUrl, file.type);
}
