import { redirect } from 'next/navigation';

/** '내 아이'는 마이페이지로 흡수됨 — 기존 링크/북마크 호환용 리다이렉트. */
export default function CatPage() {
  redirect('/mypage');
}
