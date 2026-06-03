// 완그릇 — 내 아이 프로필 상세 화면 (이미지 참고: 큰 사진 + info pills + 설명 + CTA)

const TkC = window.WG.T;
const ageOfC = window.WG.ageGroupFromBirth;
const DC = window.WG_DATA;
const { Icon: IcoC, H1: H1C, H2: H2C, H3: H3C, H4: H4C, Body: BodyC, Small: SmC, Caption: CapC,
  Button: BtnC, Card: CardC, Chip: ChipC } = window;
const { useState: uSC } = React;

// ─── friendly auto-generated description from profile ───
function describeCat(p) {
  const ag = ageOfC(p.birth_year);
  if (!ag) return '아이의 정보를 입력하면 여기에 요약이 표시돼요.';
  const name = p.name || '우리 아이';
  const conds = p.health_conditions || [];
  const condStr = conds.length ?
  `${conds.join('·')} 진단을 받았고 ` :
  '특별한 진단 없이 ';
  const dietStr = p.current_food ?
  `현재는 "${p.current_food}"를 ${p.diet_type || '건식'} 위주로 급여 중이에요. ` :
  `현재 ${p.diet_type || '건식'} 위주로 급여하고 있어요. `;
  const goalStr = p.goal ? `목표는 "${p.goal}"예요.` : '';
  return `${name}는 만 ${ag.age}살, ${ag.label} 시기의 ${p.weight}kg ${p.neutered ? '중성화 ' : ''}고양이예요. ${condStr}${dietStr}${goalStr}`;
}

// ─── icon helpers for info pills ───
const PillIcons = {
  gender:
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="13" r="4.5" />
      <path d="M13 9l5-5M14 4h4v4" strokeLinecap="round" />
    </svg>,

  cake:
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 18h16v-6c0-1-1-2-2-2H5c-1 0-2 1-2 2v6z" strokeLinejoin="round" />
      <path d="M3 14c2 1 3-1 5 0s3-1 5 0 3-1 5 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7v3M11 6v4M14 7v3" strokeLinecap="round" />
      <circle cx="8" cy="6" r="0.8" fill="currentColor" />
      <circle cx="11" cy="5" r="0.8" fill="currentColor" />
      <circle cx="14" cy="6" r="0.8" fill="currentColor" />
    </svg>,

  paw:
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="6" cy="8" r="1.7" fill="currentColor" />
      <circle cx="10" cy="6" r="1.7" fill="currentColor" />
      <circle cx="14" cy="6" r="1.7" fill="currentColor" />
      <circle cx="17" cy="8.5" r="1.7" fill="currentColor" />
      <path d="M11 10.5c-3 0-5 2.4-5 4.5 0 1.4 1 2.3 2.4 2.3 1 0 1.5-0.4 2.6-0.4s1.6 0.4 2.6 0.4c1.4 0 2.4-0.9 2.4-2.3 0-2.1-2-4.5-5-4.5z" fill="currentColor" />
    </svg>,

  pin:
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.2C4.5 1.2 2.5 3.1 2.5 5.6c0 3 4.5 7.2 4.5 7.2s4.5-4.2 4.5-7.2c0-2.5-2-4.4-4.5-4.4z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="7" cy="5.5" r="1.4" stroke="currentColor" strokeWidth="1.4" />
    </svg>,

  heart: (filled) =>
  <svg width="22" height="22" viewBox="0 0 22 22" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M11 18.5S3 13.5 3 8.2C3 5.6 5.1 3.5 7.7 3.5c1.5 0 2.7 0.7 3.3 1.6 0.6-0.9 1.8-1.6 3.3-1.6C16.9 3.5 19 5.6 19 8.2c0 5.3-8 10.3-8 10.3z" strokeLinejoin="round" />
    </svg>

};

function InfoPill({ icon, label, sub }) {
  return (
    <div style={{
      background: TkC.surface, borderRadius: 18, padding: '16px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      border: `1px solid ${TkC.border}`
    }}>
      <div style={{ color: TkC.text }}>{icon}</div>
      <div style={{ fontWeight: 600, color: TkC.text, letterSpacing: -0.2, fontSize: "20px" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: TkC.sub, marginTop: -2 }}>{sub}</div>}
    </div>);

}

function IconButton({ children, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      width: 44, height: 44, borderRadius: '50%',
      background: TkC.card, border: `1px solid ${TkC.border}`,
      color: color || TkC.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.15s'
    }}>{children}</button>);

}

function PhotoDots({ count = 6, active = 0 }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) =>
      <div key={i} style={{
        width: i === active ? 8 : 6, height: i === active ? 8 : 6,
        borderRadius: '50%',
        background: i === active ? TkC.text : TkC.borderStrong,
        transition: 'all 0.15s'
      }} />
      )}
    </div>);

}

// ─── MAIN SCREEN ───
function CatProfileScreen({ profile, onBack, onSeeRecs, onEdit, isFirstTime }) {
  const ag = ageOfC(profile.birth_year);
  const [liked, setLiked] = uSC(true);

  const genderLabel = profile.neutered ? '중성화 ✓' : '미중성화';
  const ageLabel = ag ? `${ag.age}세` : '—';
  const ageSub = ag ? ag.label : '';

  return (
    <div style={{ background: TkC.bg, minHeight: 'calc(100vh - 68px)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>

        {/* TOP MINI NAV (mimics phone "Details" header) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <IconButton onClick={onBack}>
            <IcoC name="back" size={18} />
          </IconButton>
          <div style={{ fontSize: 16, fontWeight: 600, color: TkC.text, letterSpacing: -0.2 }}>
            내 아이 프로필
          </div>
          <IconButton onClick={() => setLiked(!liked)} color={liked ? '#E74C5A' : TkC.sub}>
            {PillIcons.heart(liked)}
          </IconButton>
        </div>

        {/* "프로필 등록 완료!" toast — only first time */}
        {isFirstTime &&
        <div style={{
          background: TkC.greenSoft, color: TkC.green,
          padding: '12px 16px', borderRadius: 14, marginBottom: 16,
          fontSize: 13.5, fontWeight: 600, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
            <IcoC name="check" size={14} /> 프로필이 등록됐어요. 추천 사료가 준비됐습니다.
          </div>
        }

        {/* HERO PHOTO CARD */}
        <div style={{
          background: TkC.blue, borderRadius: 28, height: 380,
          marginBottom: 16, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative'
        }}>
          <image-slot
            id={`cat-hero-${profile.name || 'default'}`}
            shape="rect"
            placeholder="고양이 사진을 드래그해 올려보세요"
            style={{ width: '100%', height: '100%', display: 'block' }}>
          </image-slot>
        </div>

        <div style={{ marginBottom: 24 }}>
          <PhotoDots count={6} active={0} />
        </div>

        {/* NAME + AGE row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, color: TkC.text, lineHeight: 1 }}>
            {profile.name || '이름 없음'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: TkC.text, letterSpacing: -0.5 }}>
            {ag ? `만 ${ag.age}세` : ''}
          </div>
        </div>

        {/* META row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TkC.sub, marginBottom: 24 }}>
          <span style={{ color: TkC.sub }}>{PillIcons.pin}</span>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>
            {profile.diet_type || '건식'} 위주 · 마지막 분석 2026.05
          </span>
        </div>

        {/* 3 INFO PILLS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
          <InfoPill icon={PillIcons.gender} label={genderLabel} />
          <InfoPill icon={PillIcons.cake} label={ageLabel} sub={ageSub} />
          <InfoPill icon={PillIcons.paw} label={`${profile.weight || '—'}kg`} />
        </div>

        {/* DIAGNOSIS chips */}
        {(profile.health_conditions || []).length > 0 &&
        <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: TkC.sub, marginBottom: 10 }}>
              진단 / 관찰
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(profile.health_conditions || []).map((c) =>
            <ChipC key={c} variant="blue" size="md">{c}</ChipC>
            )}
              <ChipC variant="yellow" size="md">목표: {profile.goal}</ChipC>
            </div>
          </div>
        }

        {/* DESCRIPTION */}
        <div style={{
          fontSize: 15, lineHeight: 1.75, color: TkC.text,
          marginBottom: 32, letterSpacing: -0.15
        }}>
          {describeCat(profile)}
        </div>

        {/* PRIMARY CTA */}
        <button onClick={onSeeRecs} style={{
          width: '100%', height: 62, borderRadius: 999,
          background: TkC.text, color: '#fff', border: 'none',
          fontSize: 16, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: -0.3,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'opacity 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = 0.92}
        onMouseLeave={(e) => e.currentTarget.style.opacity = 1}>
          {isFirstTime ? '추천 사료 보러 가기' : '추천 사료 다시 보기'} <IcoC name="fwd" size={16} />
        </button>

        {/* SECONDARY action */}
        <button onClick={onEdit} style={{
          width: '100%', marginTop: 8, height: 48,
          background: 'transparent', color: TkC.sub, border: 'none',
          fontSize: 14, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit'
        }}>
          프로필 수정하기
        </button>
      </div>
    </div>);

}

window.WG_CAT = CatProfileScreen;