'use client';
import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { CatAvatar, Small } from '@/components/ui';
import { processCatPhoto, validateUpload } from '@/lib/storage/image';

type Props = {
  name?: string;
  preview: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
};

export function PhotoUploadSlot({ name, preview, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(file: File) {
    setErr(null);
    const v = validateUpload(file);
    if (!v.ok) {
      setErr(v.reason);
      return;
    }
    try {
      setBusy(true);
      const { dataUrl } = await processCatPhoto(file);
      onChange(dataUrl);
    } catch {
      setErr('이미지 처리 중 문제가 생겼어요. 다른 사진을 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-20 w-20 shrink-0 cursor-pointer"
        aria-label="고양이 사진 업로드"
      >
        <CatAvatar
          size={80}
          name={name || '?'}
          imageSrc={preview ?? null}
          accent="#FBEFC1"
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Camera size={24} />
        </div>
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-[10px] border border-border-soft bg-surface-card px-3 py-1.5 text-[13px] font-semibold text-brand-text transition-colors hover:border-border-strong disabled:opacity-50"
          >
            {busy ? '처리 중…' : preview ? '사진 변경' : '사진 추가 (선택)'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 rounded-[10px] px-2 py-1.5 text-[13px] font-medium text-brand-sub hover:text-brand-danger"
            >
              <X size={14} /> 제거
            </button>
          )}
        </div>
        <Small className="mt-2">
          {err ? <span className="text-brand-danger">{err}</span> : 'JPG, PNG, WEBP, HEIC · 최대 5MB'}
        </Small>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,.heic"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
