'use client';
import imageCompression from 'browser-image-compression';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

/**
 * Compress + (when needed) convert HEIC to JPEG. Output: ~1200px long edge.
 * Why: iOS users upload HEIC which most browsers can't display directly.
 */
export async function processCatPhoto(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const isHeic = /heic/i.test(file.type) || /\.heic$/i.test(file.name);
  const compressed = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1200,
    fileType: isHeic ? 'image/jpeg' : file.type,
    useWebWorker: true,
  });
  const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
  return { blob: compressed, dataUrl };
}

export function validateUpload(file: File): { ok: true } | { ok: false; reason: string } {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: '파일이 너무 커요 (최대 5MB)' };
  }
  const isHeic = /heic/i.test(file.type) || /\.heic$/i.test(file.name);
  if (!isHeic && !ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, reason: 'JPG, PNG, WEBP, HEIC만 업로드할 수 있어요' };
  }
  return { ok: true };
}
