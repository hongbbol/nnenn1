import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * 온보딩에서 받은 base64 dataURL을 cat-photos 버킷에 업로드하고 path를 반환한다.
 * Path 규약: {user_id}/{cat_id}/{uuid}.{ext} (Storage RLS가 첫 폴더=user_id를 검사).
 * 사용자 토큰 기반 server client를 받으므로 RLS authenticated 정책을 통과한다.
 */
export async function uploadCatPhotoFromDataUrl(
  supabase: SupabaseClient,
  userId: string,
  catId: string,
  dataUrl: string,
): Promise<string | null> {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const ext = EXT_BY_MIME[mime] ?? 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  const path = `${userId}/${catId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('cat-photos')
    .upload(path, buffer, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}
