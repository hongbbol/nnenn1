// 완그릇 — Screens (Landing, Profile, Recommendation, Compare) + App root.

const { T: Tk, ICON: Ic, ageGroupFromBirth: ageOf } = window.WG;
const Data = window.WG_DATA;
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM, Fragment: F } = React;

// shorthand to grab primitives
const { Icon, H1, H2, H3, H4, Body, Small, Caption, Mono,
  Button, Card, Chip, Input, Segmented, Stepper, CatAvatar, FoodArt } = window;

// ═══════════════════════════════════════════════════════
//  NAV
// ═══════════════════════════════════════════════════════
function TopNav({ route, onRoute, hasProfile }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(250,250,246,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${Tk.border}`
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 68
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => onRoute('landing')} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ ...{
                width: 36, height: 36, borderRadius: 10, background: Tk.blue,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: Tk.blueDeep
              }, color: "rgb(15, 61, 98)", background: "rgb(241, 244, 30)" }}><Icon name="bowl" size={20} /></div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: Tk.text }}>완그릇</span>
          </button>
          <span style={{
            fontSize: 12, fontWeight: 600, color: Tk.sub, background: Tk.surface,
            padding: '5px 9px', borderRadius: 7
          }}>beta</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasProfile &&
          <>
              <NavLink active={route === 'rec'} onClick={() => onRoute('rec')}>추천 결과</NavLink>
              <NavLink active={route === 'compare'} onClick={() => onRoute('compare')}>비교</NavLink>
              <NavLink active={route === 'cat'} onClick={() => onRoute('cat')}>내 아이</NavLink>
              <div style={{ width: 1, height: 22, background: Tk.border, margin: '0 8px' }} />
            </>
          }
          <NavLink>도움말</NavLink>
          <Button size="md" variant="ghost">로그인</Button>
        </div>
      </div>
    </div>);

}

function NavLink({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? Tk.surface : 'none', border: 'none', cursor: 'pointer',
      padding: '8px 14px', borderRadius: 10,
      color: active ? Tk.text : Tk.sub, fontWeight: active ? 600 : 500, fontSize: 14,
      fontFamily: 'inherit', transition: 'all 0.15s'
    }}>{children}</button>);

}

// ═══════════════════════════════════════════════════════
//  LANDING
// ═══════════════════════════════════════════════════════
function LandingScreen({ onStart, onDemo }) {
  return (
    <div>
      {/* HERO */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 32px 96px' }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <Chip variant="blue" size="md" leading={<Icon name="leaf" size={14} />} style={{ marginBottom: 18 }}>중·노령 고양이 전용</Chip>
            <H1 style={{ fontSize: 56 }}>
              우리 아이 컨디션에 맞는<br />
              사료를 <span style={{ background: `linear-gradient(180deg, transparent 62%, ${Tk.yellow} 62%)` }}></span> 알려드려요
            </H1>
            <Body muted style={{ fontSize: 17, marginTop: 24, maxWidth: 520, lineHeight: 1.65 }}>
              나이·체중·질환·현재 식단을 종합해서 가장 부담이 적은 사료 두 가지를 추천해 요. 왜 맞는지 한 줄 요약과 체크리스트로 보여드리고, 현재 사료와 성분도 표로 비교해드려요.
            </Body>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <Button onClick={onStart} trailing={<Icon name="fwd" size={16} />}>3분 안에 시작하기</Button>
              <Button variant="ghost" onClick={onDemo}>예시 결과 먼저 보기</Button>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 36, color: Tk.sub, fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={14} color={Tk.green} /> 고양이 최적 맞춤</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={14} color={Tk.green} /> 수의영양학 가이드 기반</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={14} color={Tk.green} /> 비교 선택 가능</span>
            </div>
          </div>

          {/* hero preview */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: -40, background: `radial-gradient(ellipse at center, ${Tk.blue}55, transparent 70%)`, zIndex: 0, pointerEvents: 'none'
            }} />
            <Card padding={20} style={{ position: 'relative', zIndex: 1, boxShadow: '0 24px 60px -24px rgba(20,16,8,0.15), 0 1px 0 rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <CatAvatar name="낭낭이" size={44} />
                <div style={{ flex: 1 }}>
                  <H4>낭낭이 · 9살 · 4.7kg</H4>
                  <Small>신부전 초기 · 건식 위주</Small>
                </div>
                <Chip variant="ok" size="sm">예시</Chip>
              </div>
              <div style={{ height: 1, background: Tk.border, margin: '4px 0 16px' }} />
              <Caption style={{ marginBottom: 12 }}>추천 사료 TOP 2</Caption>
              {Data.FOODS.slice(0, 2).map((f, i) =>
              <div key={f.id} style={{
                display: 'flex', gap: 12, padding: '12px 0',
                borderTop: i > 0 ? `1px solid ${Tk.border}` : 'none', alignItems: 'center'
              }}>
                  <FoodArt accent={f.accent} label={f.category} size={56} brand={f.brand} image={f.image} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <Chip variant="yellow" size="sm">TOP {i + 1}</Chip>
                      <Small>{f.brand}</Small>
                    </div>
                    <H4 style={{ marginTop: 4, fontSize: 14 }}>{f.product_name}</H4>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {f.tags.slice(0, 3).map((t) => <Chip key={t} variant="blue" size="sm">{t}</Chip>)}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ ...{ background: Tk.yellowSoft, borderRadius: 12, padding: '10px 14px', marginTop: 12 }, background: "rgba(242, 244, 31, 0.243)" }}>
                <Small muted={false} style={{ color: Tk.yellowDark, fontWeight: 600, fontSize: 12 }}>
                  💡 인 함량 약 52% ↓, 나트륨 약 48% ↓
                </Small>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ ...{ background: Tk.surface, padding: '80px 0' }, background: "rgb(224, 237, 243)" }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <Caption style={{ marginBottom: 12 }}>어떻게 알 수 있어요?</Caption>
          <H2 style={{ marginBottom: 48, maxWidth: 640 }}>세 단계만 거치면, 우리 아이에게 맞는 사료를 만나요</H2>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
            { num: '01', t: '아이 정보 입력', s: '나이·체중·질환·현재 사료·목표를 3분 안에 입력해요. 진단 정보가 없어도 괜찮아요.', icon: 'paw' },
            { num: '02', t: 'TOP 2 추천', s: '연령·질환 적합도, 성분, 기호성을 종합해서 가장 부담이 적은 두 가지를 골라드려요.', icon: 'spark' },
            { num: '03', t: '현재 사료와 비교', s: '인·나트륨·칼로리가 어떻게 다른지 표로 보여드리고, 전환 가이드도 알려드려요.', icon: 'scale' }].
            map((s) =>
            <Card key={s.num} padding={28} style={{ background: Tk.card }}>
                <Mono style={{ fontSize: 13, color: Tk.faint, fontWeight: 600 }}>{s.num}</Mono>
                <div style={{ ...{
                  width: 48, height: 48, borderRadius: 14, background: Tk.blue, color: Tk.blueDeep,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 18
                }, background: "rgb(241, 244, 30)", color: "rgb(79, 48, 30)" }}><Icon name={s.icon} size={24} /></div>
                <H3 style={{ marginBottom: 8 }}>{s.t}</H3>
                <Body muted style={{ fontSize: 14 }}>{s.s}</Body>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div className="why-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
            <div>
              <Caption style={{ marginBottom: 12 }}>왜 완그릇이에요?</Caption>
              <H2 style={{ marginBottom: 24 }}>광고가 아닌, 우리 아이 기준으로 골라요</H2>
              <Body muted style={{ fontSize: 16, lineHeight: 1.7 }}>
                대부분의 사료 추천은 "잘 팔리는 제품" 중심이에요. 완그릇은 우리 아이 나이와 진단을 먼저 보고, 성분 기준으로만 사료를 거른 다음, 그중에서 가장 적합한 두 가지를 골라요. 제휴 링크와 추천 결과는 분리해서 표기해요.
              </Body>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
              { i: 'drop', t: '수분·인·나트륨까지 본다', s: '주요 성분 9가지를 모두 비교해 종합 적합도를 계산해요.' },
              { i: 'heart', t: '질환 가이드 반영', s: '신부전·당뇨·결석 등 진단별 권장 영양 기준을 적용해요.' },
              { i: 'leaf', t: '진단 없어도 OK', s: '진단이 없어도 나이·체중·목표만으로 추천이 가능해요.' }].
              map((r) =>
              <Card key={r.t} padding={20} hoverable>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{
                    width: 40, height: 40, borderRadius: 10, background: Tk.blue, color: Tk.blueDeep,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}><Icon name={r.i} size={20} /></div>
                    <div>
                      <H4>{r.t}</H4>
                      <Body muted style={{ fontSize: 14, marginTop: 4 }}>{r.s}</Body>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* BIG CTA */}
      <section style={{ padding: '0 0 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <Card padding={48} style={{
            background: Tk.text, borderColor: Tk.text,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24
          }}>
            <div>
              <H2 style={{ color: '#fff', marginBottom: 8 }}>지금 아이 정보로 시작해볼까요?</H2>
              <Body style={{ color: 'rgba(255,255,255,0.7)' }}>3분 정도 걸려요. 진단이나 사료명을 모르면 비워두셔도 돼요.</Body>
            </div>
            <Button onClick={onStart} variant="primary" size="lg" trailing={<Icon name="fwd" size={16} />}>추천 받기 시작</Button>
          </Card>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${Tk.border}`, padding: '32px 0', background: Tk.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <Small>© 2026 완그릇 — 가제. 본 추천은 의료 진단을 대체하지 않아요.</Small>
          <div style={{ display: 'flex', gap: 16 }}>
            <Small>이용약관</Small>
            <Small>개인정보</Small>
            <Small>광고·제휴 표기</Small>
          </div>
        </div>
      </footer>
    </div>);

}

window.WG_LANDING = LandingScreen;
window.WG_NAV = TopNav;