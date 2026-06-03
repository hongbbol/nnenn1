// 완그릇 — Profile flow with 3 UX variants (stepped / one-page / chat).

const TkP = window.WG.T;
const IcP = window.WG.ICON;
const DataP = window.WG_DATA;
const ageOfP = window.WG.ageGroupFromBirth;
const { Icon: IconP, H1: H1P, H2: H2P, H3: H3P, H4: H4P, Body: BodyP, Small: SmallP, Caption: CapP, Mono: MonoP,
        Button: BtnP, Card: CardP, Chip: ChipP, Input: InpP, Segmented: SegP, Stepper: StepP, CatAvatar: CatP } = window;

const STEPS = [
  { id: 'basic', label: '기본 정보', title: '아이의 기본 정보를 알려주세요', sub: '나이와 체중부터 시작해요.' },
  { id: 'diet',  label: '현재 식단', title: '지금 어떤 사료를 먹고 있나요?', sub: '비교를 위해 알려주세요.' },
  { id: 'health',label: '건강 상태', title: '건강 상태가 어때요?', sub: '진단 받았거나 관찰된 증상을 골라주세요.' },
  { id: 'goal',  label: '목표',     title: '바라는 목표가 있어요?', sub: '추천에 가장 큰 영향을 줘요.' },
];

function FieldLabel({ children, hint }) {
  return (
    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: TkP.text, letterSpacing: -0.1 }}>{children}</div>
      {hint}
    </div>
  );
}

function ProfileFormBasic({ p, set, autoFocus }) {
  const ag = ageOfP(p.birth_year);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <FieldLabel>이름</FieldLabel>
        <InpP value={p.name} onChange={v => set({ name: v })} placeholder="예: 보리" autoFocus={autoFocus} />
      </div>
      <div>
        <FieldLabel hint={ag && <span style={{ color: TkP.blueDeep, fontWeight: 600, fontSize: 13 }}>만 {ag.age}살 · {ag.label} ({ag.group})</span>}>출생년도</FieldLabel>
        <InpP value={p.birth_year} onChange={v => set({ birth_year: v.replace(/\D/g, '').slice(0,4) })} placeholder="2017" suffix="년" inputMode="numeric" />
      </div>
      <div>
        <FieldLabel>몸무게</FieldLabel>
        <InpP value={p.weight} onChange={v => set({ weight: v.replace(/[^\d.]/g,'').slice(0,4) })} placeholder="4.7" suffix="kg" inputMode="decimal" />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <FieldLabel>중성화</FieldLabel>
        <SegP options={['완료', '안 함', '몰라요']} value={p.neutered_label || ''} onChange={v => set({ neutered_label: v, neutered: v === '완료' })} />
      </div>
    </div>
  );
}

function ProfileFormDiet({ p, set }) {
  const popular = ['데일리 인도어 어덜트', '내추럴 그레인프리', '시니어 라이트 어덜트', '키튼 포뮬러'];
  const avoid = ['곡물', '닭', '소고기', '생선', '유제품', '옥수수'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <FieldLabel>주로 먹는 식단</FieldLabel>
        <SegP options={DataP.DIET_OPTIONS} value={p.diet_type || ''} onChange={v => set({ diet_type: v })} />
      </div>
      <div>
        <FieldLabel hint={p.current_food && <span style={{ color: TkP.green, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}><IconP name="check" size={12} /> 입력됨</span>}>
          지금 먹이는 사료
        </FieldLabel>
        <InpP value={p.current_food} onChange={v => set({ current_food: v })} placeholder="브랜드 또는 제품명" />
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {popular.map(s => (
            <ChipP key={s} variant="soft" size="sm" onClick={() => set({ current_food: s })}>{s}</ChipP>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel hint={<SmallP>중복 가능</SmallP>}>피하고 싶은 성분</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {avoid.map(ing => {
            const sel = (p.avoid_ingredients || []).includes(ing);
            return (
              <ChipP key={ing} selected={sel} size="md" onClick={() => {
                const cur = p.avoid_ingredients || [];
                set({ avoid_ingredients: sel ? cur.filter(x => x !== ing) : [...cur, ing] });
              }}>{ing}</ChipP>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfileFormHealth({ p, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <FieldLabel hint={<SmallP>중복 가능 · 진단 없으면 비워두세요</SmallP>}>진단 또는 관찰된 증상</FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {DataP.HEALTH_OPTIONS.map(c => {
          const sel = (p.health_conditions || []).includes(c.id);
          return (
            <button key={c.id} onClick={() => {
              const cur = p.health_conditions || [];
              let next;
              if (sel) {
                next = cur.filter(x => x !== c.id);
              } else if (c.exclusive) {
                next = [c.id];
              } else {
                next = cur.filter(x => {
                  const opt = DataP.HEALTH_OPTIONS.find(o => o.id === x);
                  if (!opt) return true;
                  if (opt.exclusive) return false;
                  if (c.group && opt.group === c.group) return false;
                  return true;
                }).concat(c.id);
              }
              set({ health_conditions: next });
            }} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 12,
              background: sel ? TkP.blue : TkP.card,
              border: `1.5px solid ${sel ? TkP.blueDeep : TkP.border}`,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: sel ? TkP.blueDeep : 'transparent',
                border: `1.5px solid ${sel ? TkP.blueDeep : TkP.borderStrong}`,
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{sel && <IconP name="check" size={12} />}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: TkP.text }}>{c.id}</div>
                {c.desc && <div style={{ fontSize: 12, color: TkP.sub, marginTop: 2 }}>{c.desc}</div>}
              </div>
            </button>
          );
        })}
      </div>
      <CardP padding={14} style={{ background: TkP.surface, borderColor: 'transparent' }}>
        <div style={{ display: 'flex', gap: 10, color: TkP.blueDeep }}>
          <div style={{ paddingTop: 2 }}><IconP name="info" size={14} /></div>
          <BodyP style={{ fontSize: 13, color: TkP.text }}>
            완그릇 추천은 보조 도구예요. 진단·치료는 수의사와 상의하세요.
          </BodyP>
        </div>
      </CardP>
    </div>
  );
}

function ProfileFormGoal({ p, set }) {
  const hasDisease = (p.health_conditions || []).some(c => c !== '질병 없음');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {hasDisease && (
        <div style={{
          display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 12,
          background: TkP.blue, color: TkP.blueDeep,
          fontSize: 13, fontWeight: 500, lineHeight: 1.55,
          marginBottom: 6,
        }}>
          <div style={{ paddingTop: 1, flexShrink: 0 }}><IconP name="info" size={14} /></div>
          <div>
            <strong style={{ fontWeight: 700 }}>질환이 있는 아이는 "질환관리"가 자동으로 우선돼요.</strong><br/>
            <span style={{ color: TkP.blueInk }}>여기서 고르신 목표는 보조 기준으로 적용돼요 — 질환에 안전한 사료들 중에서 선택하신 목표에 맞춰 순위를 매겨드려요.</span>
          </div>
        </div>
      )}
      {DataP.GOAL_OPTIONS.map(g => {
        const sel = p.goal === g.id;
        return (
          <button key={g.id} onClick={() => set({ goal: g.id })} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 20, borderRadius: 14, cursor: 'pointer',
            background: sel ? TkP.text : TkP.card, color: sel ? '#fff' : TkP.text,
            border: `1.5px solid ${sel ? TkP.text : TkP.border}`,
            fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{g.id}</div>
              <div style={{ fontSize: 13, marginTop: 4, opacity: sel ? 0.7 : 1, color: sel ? 'rgba(255,255,255,0.7)' : TkP.sub }}>{g.desc}</div>
            </div>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: sel ? '#fff' : 'transparent',
              border: `1.5px solid ${sel ? '#fff' : TkP.borderStrong}`,
              color: TkP.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{sel && <IconP name="check" size={14} />}</div>
          </button>
        );
      })}
    </div>
  );
}

function FormByStep({ stepId, p, set, autoFocus }) {
  if (stepId === 'basic')  return <ProfileFormBasic p={p} set={set} autoFocus={autoFocus} />;
  if (stepId === 'diet')   return <ProfileFormDiet p={p} set={set} />;
  if (stepId === 'health') return <ProfileFormHealth p={p} set={set} />;
  if (stepId === 'goal')   return <ProfileFormGoal p={p} set={set} />;
  return null;
}

function canProceed(stepId, p) {
  if (stepId === 'basic')  return p.name && p.birth_year && p.weight && p.neutered_label;
  if (stepId === 'diet')   return !!p.diet_type;
  if (stepId === 'health') return true;
  if (stepId === 'goal')   return !!p.goal;
  return false;
}

// ═══════════════════════════════════════════════════════
//  VARIANT 1: 단계별 (stepped)
// ═══════════════════════════════════════════════════════
function ProfileSteppedScreen({ profile, setProfile, onSubmit, onClose }) {
  const [idx, setIdx] = uS(0);
  const step = STEPS[idx];
  const set = patch => setProfile({ ...profile, ...patch });
  const ok = canProceed(step.id, profile);

  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', background: TkP.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 32px 0' }}>
        <Stepper current={idx} steps={STEPS} />
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 32px 0' }}>
        <H2 style={{ marginBottom: 12 }}>{step.title}</H2>
        <BodyP muted style={{ marginBottom: 36 }}>{step.sub}</BodyP>
        <FormByStep stepId={step.id} p={profile} set={set} autoFocus />
      </div>
      <div style={{
        position: 'sticky', bottom: 0, marginTop: 48,
        background: 'linear-gradient(180deg, rgba(250,250,246,0) 0%, rgba(250,250,246,1) 32%)',
        padding: '24px 32px 28px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <BtnP variant="ghost" onClick={() => idx > 0 ? setIdx(idx - 1) : onClose()} leading={<IconP name="back" size={16} />}>이전</BtnP>
          <BtnP disabled={!ok} onClick={() => idx < STEPS.length - 1 ? setIdx(idx + 1) : onSubmit()} trailing={<IconP name="fwd" size={16} />}>
            {idx < STEPS.length - 1 ? '다음' : '추천 받기'}
          </BtnP>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  VARIANT 2: 단일 페이지 (one-page form)
// ═══════════════════════════════════════════════════════
function ProfileOnePageScreen({ profile, setProfile, onSubmit, onClose }) {
  const set = patch => setProfile({ ...profile, ...patch });
  const sectionRefs = STEPS.map(() => uR(null));
  const [activeIdx, setActiveIdx] = uS(0);

  uE(() => {
    const onScroll = () => {
      let active = 0;
      sectionRefs.forEach((r, i) => {
        if (!r.current) return;
        const rect = r.current.getBoundingClientRect();
        if (rect.top < 200) active = i;
      });
      setActiveIdx(active);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const allOk = STEPS.every(s => canProceed(s.id, profile));
  const completedCount = STEPS.filter(s => canProceed(s.id, profile)).length;

  return (
    <div style={{ background: TkP.bg, paddingBottom: 100 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 48, alignItems: 'start' }}>
        {/* SIDEBAR */}
        <div style={{ position: 'sticky', top: 92 }}>
          <CapP style={{ marginBottom: 16 }}>프로필 작성</CapP>
          <H3P style={{ marginBottom: 8 }}>{completedCount} / {STEPS.length}</H3P>
          <div style={{ height: 4, background: TkP.border, borderRadius: 99, marginBottom: 24 }}>
            <div style={{ height: '100%', width: `${(completedCount/STEPS.length)*100}%`, background: TkP.text, borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {STEPS.map((s, i) => {
              const done = canProceed(s.id, profile);
              const active = i === activeIdx;
              return (
                <button key={s.id} onClick={() => sectionRefs[i].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: active ? TkP.surface : 'transparent', borderRadius: 10,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    color: TkP.text,
                  }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: done ? TkP.green : 'transparent',
                    border: done ? 'none' : `1.5px solid ${TkP.borderStrong}`,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>{done ? <IconP name="check" size={12} /> : i + 1}</div>
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 500 }}>{s.label}</span>
                </button>
              );
            })}
          </div>
          <BtnP onClick={onSubmit} disabled={!allOk} full size="md" style={{ marginTop: 24 }} trailing={<IconP name="fwd" size={14} />}>
            추천 받기
          </BtnP>
        </div>

        {/* MAIN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
          {STEPS.map((s, i) => (
            <section key={s.id} ref={sectionRefs[i]} style={{ scrollMarginTop: 92 }}>
              <CapP style={{ marginBottom: 6 }}>STEP {i + 1}</CapP>
              <H2P style={{ marginBottom: 8 }}>{s.title}</H2P>
              <BodyP muted style={{ marginBottom: 28 }}>{s.sub}</BodyP>
              <CardP padding={28}>
                <FormByStep stepId={s.id} p={profile} set={set} />
              </CardP>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  VARIANT 3: 챗봇형
// ═══════════════════════════════════════════════════════
function ProfileChatScreen({ profile, setProfile, onSubmit, onClose }) {
  const set = patch => setProfile({ ...profile, ...patch });
  // Chat script: each turn = {bot: '...', ask: 'name'|'birth'|'weight'|'neutered'|...}
  const TURNS = [
    { bot: '안녕하세요! 우리 아이에게 맞는 사료를 찾아드릴게요. 먼저 이름을 알려주세요 🐱', ask: 'name' },
    { bot: p => `${p.name} 반가워요! ${p.name}는 몇 년도에 태어났나요?`, ask: 'birth_year' },
    { bot: p => { const ag = ageOfP(p.birth_year); return `${p.name}는 만 ${ag.age}살 ${ag.label}이네요. 몸무게는 어떻게 돼요?`; }, ask: 'weight' },
    { bot: '중성화는 완료했어요?', ask: 'neutered' },
    { bot: p => `좋아요. 지금 ${p.name}는 어떤 식단을 먹어요?`, ask: 'diet_type' },
    { bot: '먹이는 사료 이름 알려주세요. (모르면 건너뛰기)', ask: 'current_food', skippable: true },
    { bot: '진단받았거나 관찰된 증상이 있어요? 없으면 건너뛰기 누르세요.', ask: 'health_conditions', skippable: true },
    { bot: '마지막으로, 가장 신경 쓰고 싶은 목표를 골라주세요.', ask: 'goal' },
    { bot: p => `완료! ${p.name}에게 맞는 사료를 찾아볼게요 ✨`, ask: 'done' },
  ];

  const [turnIdx, setTurnIdx] = uS(0);
  const [typing, setTyping] = uS(false);
  const scrollRef = uR(null);

  uE(() => {
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 700);
    return () => clearTimeout(t);
  }, [turnIdx]);

  uE(() => {
    scrollRef.current?.scrollTo({ top: 9999, behavior: 'smooth' });
  });

  const advance = () => setTurnIdx(i => Math.min(i + 1, TURNS.length - 1));

  const current = TURNS[turnIdx];

  const renderInput = () => {
    if (typing) return null;
    if (current.ask === 'done') {
      return <BtnP onClick={onSubmit} trailing={<IconP name="fwd" size={16} />}>추천 결과 보기</BtnP>;
    }
    if (current.ask === 'name') {
      return <ChatTextInput placeholder="이름" value={profile.name} onSubmit={v => { set({ name: v }); advance(); }} />;
    }
    if (current.ask === 'birth_year') {
      return <ChatTextInput placeholder="2017" inputMode="numeric" suffix="년" value={profile.birth_year}
        onSubmit={v => { const x = v.replace(/\D/g,'').slice(0,4); set({ birth_year: x }); advance(); }} />;
    }
    if (current.ask === 'weight') {
      return <ChatTextInput placeholder="4.7" inputMode="decimal" suffix="kg" value={profile.weight}
        onSubmit={v => { set({ weight: v.replace(/[^\d.]/g,'').slice(0,4) }); advance(); }} />;
    }
    if (current.ask === 'neutered') {
      return <ChatChips options={['완료', '안 함', '몰라요']} onPick={v => { set({ neutered_label: v, neutered: v === '완료' }); advance(); }} />;
    }
    if (current.ask === 'diet_type') {
      return <ChatChips options={DataP.DIET_OPTIONS} onPick={v => { set({ diet_type: v }); advance(); }} />;
    }
    if (current.ask === 'current_food') {
      return <ChatTextInput placeholder="브랜드 또는 제품명" skippable onSkip={advance}
        onSubmit={v => { set({ current_food: v }); advance(); }} />;
    }
    if (current.ask === 'health_conditions') {
      return <ChatMultiPick options={DataP.HEALTH_OPTIONS.map(o => o.id)} value={profile.health_conditions || []}
        onChange={v => set({ health_conditions: v })} onDone={() => advance()} skippable onSkip={advance} />;
    }
    if (current.ask === 'goal') {
      return <ChatChips options={DataP.GOAL_OPTIONS.map(g => g.id)} onPick={v => { set({ goal: v }); advance(); }} />;
    }
    return null;
  };

  const visibleTurns = TURNS.slice(0, turnIdx + 1);

  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', background: TkP.bg, display: 'flex', flexDirection: 'column' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '32px 0' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visibleTurns.map((t, i) => {
            const isLast = i === visibleTurns.length - 1;
            const botText = typeof t.bot === 'function' ? t.bot(profile) : t.bot;
            return (
              <F key={i}>
                <ChatBubble who="bot" hide={isLast && typing}>{botText}</ChatBubble>
                {isLast && typing && <ChatTyping />}
                {/* show user's saved answer for previous turns */}
                {!isLast && <UserAnswerBubble turn={t} profile={profile} />}
              </F>
            );
          })}
        </div>
      </div>
      <div style={{
        borderTop: `1px solid ${TkP.border}`, background: TkP.card, padding: '20px 32px',
        position: 'sticky', bottom: 0,
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {renderInput()}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ children, who, hide }) {
  if (hide) return null;
  const bot = who === 'bot';
  return (
    <div style={{ display: 'flex', justifyContent: bot ? 'flex-start' : 'flex-end', alignItems: 'flex-end', gap: 10 }}>
      {bot && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: TkP.yellow, color: TkP.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><IconP name="bowl" size={16} /></div>
      )}
      <div style={{
        padding: '12px 16px', borderRadius: bot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: bot ? TkP.card : TkP.text, color: bot ? TkP.text : '#fff',
        border: bot ? `1px solid ${TkP.border}` : 'none',
        maxWidth: 460, fontSize: 14.5, lineHeight: 1.55, fontWeight: 500,
      }}>{children}</div>
    </div>
  );
}

function ChatTyping() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: TkP.yellow, color: TkP.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconP name="bowl" size={16} /></div>
      <div style={{ padding: '14px 18px', borderRadius: '4px 16px 16px 16px', background: TkP.card, border: `1px solid ${TkP.border}`, display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="dot" style={{
            width: 6, height: 6, borderRadius: '50%', background: TkP.faint,
            animation: `bounce 1.2s infinite`, animationDelay: `${i * 0.15}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

function UserAnswerBubble({ turn, profile }) {
  let answer = '';
  if (turn.ask === 'name') answer = profile.name;
  else if (turn.ask === 'birth_year') answer = profile.birth_year ? `${profile.birth_year}년` : '건너뜀';
  else if (turn.ask === 'weight') answer = profile.weight ? `${profile.weight}kg` : '';
  else if (turn.ask === 'neutered') answer = profile.neutered_label;
  else if (turn.ask === 'diet_type') answer = profile.diet_type;
  else if (turn.ask === 'current_food') answer = profile.current_food || '건너뜀';
  else if (turn.ask === 'health_conditions') answer = profile.health_conditions?.length ? profile.health_conditions.join(', ') : '없음';
  else if (turn.ask === 'goal') answer = profile.goal;
  if (!answer) return null;
  return <ChatBubble who="user">{answer}</ChatBubble>;
}

function ChatTextInput({ placeholder, suffix, inputMode, value, onSubmit, skippable, onSkip }) {
  const [v, setV] = uS(value || '');
  const submit = () => { if (v.trim()) onSubmit(v.trim()); };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <InpP value={v} onChange={setV} placeholder={placeholder} suffix={suffix} inputMode={inputMode} autoFocus />
      </div>
      {skippable && <BtnP variant="text" onClick={onSkip}>건너뛰기</BtnP>}
      <BtnP onClick={submit} disabled={!v.trim()} size="md" style={{ height: 52, padding: '0 20px' }}>전송</BtnP>
    </div>
  );
}

function ChatChips({ options, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(o => (
        <button key={o} onClick={() => onPick(o)} style={{
          padding: '12px 18px', borderRadius: 999, border: `1.5px solid ${TkP.border}`,
          background: TkP.card, color: TkP.text, fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = TkP.yellow; e.currentTarget.style.borderColor = TkP.yellow; }}
        onMouseLeave={e => { e.currentTarget.style.background = TkP.card; e.currentTarget.style.borderColor = TkP.border; }}
        >{o}</button>
      ))}
    </div>
  );
}

function ChatMultiPick({ options, value, onChange, onDone, skippable, onSkip }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(o => {
          const sel = value.includes(o);
          return (
            <ChipP key={o} selected={sel} size="lg" onClick={() => {
              onChange(sel ? value.filter(x => x !== o) : [...value, o]);
            }}>{o}</ChipP>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {skippable && <BtnP variant="text" onClick={onSkip}>없어요</BtnP>}
        <BtnP onClick={onDone} disabled={value.length === 0} size="md">완료</BtnP>
      </div>
    </div>
  );
}

window.WG_PROFILE = { ProfileSteppedScreen, ProfileOnePageScreen, ProfileChatScreen };
