'use client';
import type { SupabaseClient } from '@supabase/supabase-js';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * 고양이 사진(base64 dataURL)을 브라우저에서 직접 cat-photos 버킷에 업로드하고 path 반환.
 *
 * 왜 클라이언트 업로드인가: dataURL(~1.5MB)을 Server Action 인자로 보내면 기본 1MB
 * body 한도에 걸린다(한도 상향은 dev 서버 재시작 필요). 사진은 여기서 올리고
 * Server Action에는 경로 문자열만 넘긴다.
 *
 * Path 규약: {user_id}/{uuid}.{ext} — Storage RLS가 첫 폴더=user_id만 검사한다.
 */
export async function uploadCatPhotoClient(
  supabase: SupabaseClient,
  userId: string,
  dataUrl: string,
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const mime = blob.type || 'image/jpeg';
  const ext = EXT_BY_MIME[mime] ?? 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('cat-photos')
    .upload(path, blob, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}
