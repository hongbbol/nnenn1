import type { Metadata } from 'next';
import { BIZ, LegalPage, P, Section, UL } from '@/components/layout/legal-page';

export const metadata: Metadata = { title: '광고·제휴 표기 — 완그릇' };

export default function AffiliatePage() {
  return (
    <LegalPage
      title="광고·제휴 표기"
      lead="추천은 우리 아이 기준으로만 고릅니다. 돈을 받는 자리가 생기면 그 자리에 표시합니다."
      updated="2026-10-22"
    >
      <Section title="현재 상태">
        <P>
          2026-10-22 기준 완그릇에는 <strong>광고·제휴 링크가 없습니다.</strong> 사료 카드에 구매처 링크나
          가격이 표시되지 않으며, 어떤 제조사·판매처로부터도 금전적 대가를 받지 않습니다.
        </P>
      </Section>

      <Section title="앞으로 제휴를 도입하면">
        <UL
          items={[
            <>구매처 링크(예: 쿠팡 파트너스, 네이버 스마트스토어)를 붙일 수 있습니다. 그 경우 링크 바로 옆에 &lsquo;광고&rsquo; 또는 &lsquo;제휴&rsquo;를 표시하고, 이 페이지에 제휴 프로그램과 수수료 구조를 공개합니다.</>,
            <>표시 문구는 공정거래위원회 &lsquo;추천·보증 등에 관한 표시·광고 심사지침&rsquo;을 따릅니다. 예: &ldquo;이 링크로 구매하면 완그릇이 일정 수수료를 받을 수 있습니다. 구매 가격에는 영향이 없습니다.&rdquo;</>,
            <>쿠팡 파트너스 활동 시 &ldquo;이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다&rdquo; 문구를 해당 화면에 표시합니다.</>,
          ]}
        />
      </Section>

      <Section title="추천 순위와 제휴는 분리됩니다">
        <UL
          items={[
            <>추천 순위는 고양이 조건(나이·체중·질환·목표)과 사료의 영양값·원료만으로 계산합니다. 제휴 여부, 수수료율, 제조사 관계는 계산에 들어가지 않습니다.</>,
            <>특정 브랜드를 우대하는 가중치를 두지 않습니다. 처방식 가점은 브랜드가 아니라 &lsquo;해당 질환용으로 설계된 사료인가&rsquo;라는 임상 분류에 균일하게 적용됩니다.</>,
            <>사료 데이터는 제조사 공식 자료에서 수집하며, 제조사가 제공한 홍보 자료나 협찬 제품을 우선 수록하지 않습니다.</>,
          ]}
        />
      </Section>

      <Section title="문의">
        <P>광고·제휴 관련 문의는 {BIZ.email}로 보내 주세요.</P>
      </Section>
    </LegalPage>
  );
}
