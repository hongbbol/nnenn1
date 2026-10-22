import type { ReactNode } from 'react';
import { TopNavServer } from '@/components/layout/top-nav-server';
import { Footer } from '@/components/layout/footer';

/**
 * 법무 페이지 공통 틀(이용약관·개인정보처리방침·광고/제휴 표기·의료 면책).
 * 2026-10-22 초안 — 법률 검토(GH #14) 전. 사업자 정보는 자리표시([ ])로 두고 확정 시 채운다.
 */
export function LegalPage({
  title,
  lead,
  updated,
  children,
}: {
  title: string;
  lead?: string;
  /** 시행(또는 최근 개정)일 — 'YYYY-MM-DD' */
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <TopNavServer />
      <main className="min-h-[calc(100vh-68px)] bg-brand-bg pb-20">
        <article className="mx-auto max-w-[720px] px-5 pt-10 md:px-8">
          <h1 className="text-[28px] font-bold leading-[1.25] tracking-[-0.02em] text-brand-text">
            {title}
          </h1>
          {lead && <p className="mt-3 text-[15px] leading-[1.7] text-brand-sub">{lead}</p>}
          <p className="mt-2 text-[12px] text-brand-faint">시행일 {updated}</p>
          <div className="mt-4 rounded-[12px] bg-brand-blue px-4 py-3 text-[13px] leading-[1.6] text-brand-blue-deep">
            이 문서는 <strong>법률 검토 전 초안</strong>입니다. 검토 후 내용이 바뀔 수 있으며, 바뀌면 시행일과 함께
            이 페이지에 공지합니다.
          </div>
          <div className="legal-body mt-8 flex flex-col gap-8 text-[14.5px] leading-[1.75] text-brand-text">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[18px] font-bold leading-[1.3] text-brand-text">{title}</h2>
      {children}
    </section>
  );
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={className ?? 'text-brand-text'}>{children}</p>;
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

/** 표(수집 항목·위탁 등) — 모바일에선 가로 스크롤. */
export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-border-soft">
      <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
        <thead className="bg-surface-1 text-left text-brand-sub">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border-soft align-top">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 확정 전 사업자 정보 자리표시. */
export const BIZ = {
  name: '[상호]',
  owner: '[대표자]',
  regNo: '[사업자등록번호]',
  address: '[사업장 주소]',
  email: '[문의 이메일]',
  privacyOfficer: '[개인정보 보호책임자 성명]',
};
