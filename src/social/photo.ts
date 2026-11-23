/** Nén ảnh thành data URL JPEG nhỏ (< ~280KB) để lưu thẳng trong Firestore */
export async function compressForShare(file: File, maxSide = 1080): Promise<string> {
  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    src = img;
  }
  let side = maxSide;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, side / Math.max(src.width, src.height));
    const w = Math.round(src.width * scale);
    const h = Math.round(src.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas không khả dụng');
    ctx.drawImage(src, 0, 0, w, h);
    const quality = attempt < 3 ? 0.78 - attempt * 0.1 : 0.55;
    const data = canvas.toDataURL('image/jpeg', quality);
    if (data.length < 280_000) {
      if ('close' in src) src.close();
      return data;
    }
    if (attempt >= 2) side = Math.round(side * 0.75);
  }
  throw new Error('Ảnh quá lớn, thử ảnh khác');
}
