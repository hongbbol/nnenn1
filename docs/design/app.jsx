// 완그릇 — Recommendation + Compare + App root.

const TkR = window.WG.T;
const IcR = window.WG.ICON;
const DR = window.WG_DATA;
const ageOfR = window.WG.ageGroupFromBirth;
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM, Fragment: FR } = React;
const { Icon: IcoR, H1: H1R, H2: H2R, H3: H3R, H4: H4R, Body: BodyR, Small: SmR, Caption: CapR, Mono: MoR,
        Button: BR, Card: CR, Chip: ChR, Segmented: SgR, CatAvatar: CaR, FoodArt: FaR } = window;

// ─────────── helpers ───────────
function profileSummaryText(p) {
  const ag = ageOfR(p.birth_year);
  return `${ag?.age}살 ${ag?.label} · ${p.weight}kg · ${p.health_conditions?.[0] || '건강'}`;
}

// ─────────── PROFILE BANNER ───────────
function ProfileBanner({ profile, onEdit }) {
  const ag = ageOfR(profile.birth_year);
  return (
    <CR padding={20} style={{ background: TkR.surface, borderColor: 'transparent', marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <CaR name={profile.name} size={52} accent={TkR.blue} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <H3R>{profile.name}</H3R>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {ag && <ChR variant="soft" size="sm">만 {ag.age}살 · {ag.label}</ChR>}
            <ChR variant="soft" size="sm">{profile.weight}kg</ChR>
            <ChR variant="soft" size="sm">{profile.diet_type}</ChR>
            {profile.health_conditions?.map(c => <ChR key={c} variant="blue" size="sm">{c}</ChR>)}
            <ChR variant="yellow" size="sm">{profile.goal}</ChR>
          </div>
        </div>
        <BR variant="ghost" size="md" onClick={onEdit}>프로필 수정</BR>
      </div>
    </CR>
  );
}

// ─────────── FOOD CARD ───────────
function FoodRecCard({ rank, food, reason, onCompare, onSave, saved, currentFood, reasonStyle = '둘 다' }) {
  const [showDetail, setShowDetail] = uS(rank === 1);
  return (
    <CR padding={0} style={{ overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ height: 4, background: food.accent }} />
      <div style={{ padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
          <FaR accent={food.accent} label={food.category} size={104} brand={food.brand} image={food.image} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <ChR variant="yellow" size="md" style={{ fontWeight: 700 }}>TOP {rank}</ChR>
              <ChR variant="soft" size="sm">{food.category}</ChR>
              {food.tags.slice(0, 2).map(t => <ChR key={t} variant="blue" size="sm">{t}</ChR>)}
            </div>
            <SmR muted style={{ fontWeight: 600, color: TkR.sub, marginBottom: 2 }}>{food.brand}</SmR>
            <H2R style={{ fontSize: 26, lineHeight: 1.25 }}>{food.product_name}</H2R>
            <BodyR muted style={{ marginTop: 8, fontSize: 14 }}>{food.ingredient_summary}</BodyR>
          </div>
          <button onClick={onSave} style={{
            border: 'none', background: saved ? TkR.yellow : TkR.surface, color: TkR.text,
            width: 44, height: 44, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }} title={saved ? '저장됨' : '저장하기'}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={saved ? 0 : 1.8}>
              <path d="M4 3h10v12l-5-3-5 3V3z" />
            </svg>
          </button>
        </div>

        {/* Headline 자연어 */}
        {(reasonStyle === '자연어' || reasonStyle === '둘 다') && (
          <div style={{
            background: TkR.yellowSoft, borderRadius: 14, padding: '16px 18px', marginBottom: 16,
            borderLeft: `4px solid ${TkR.yellow}`,
          }}>
            <CapR style={{ color: TkR.yellowDark, marginBottom: 6, fontSize: 11 }}>한 줄 요약</CapR>
            <BodyR style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{reason.headline}</BodyR>
            <BodyR style={{ fontSize: 13.5, marginTop: 8, color: TkR.text, lineHeight: 1.6 }}>{reason.summary}</BodyR>
          </div>
        )}

        {/* Checklist */}
        {(reasonStyle === '체크리스트' || reasonStyle === '둘 다') && (
          <div style={{ marginBottom: 16 }}>
            <CapR style={{ marginBottom: 10 }}>왜 적합한가요</CapR>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
              {reason.checks.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10,
                  background: c.ok ? TkR.greenSoft : TkR.dangerSoft,
                  border: `1px solid ${c.ok ? '#CBE3D3' : '#F2D1CB'}`,
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: c.ok ? TkR.green : TkR.danger, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><IcoR name={c.ok ? 'check' : 'warn'} size={11} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: TkR.text }}>{c.label}</div>
                    <div style={{ fontSize: 12, color: TkR.sub, marginTop: 2, lineHeight: 1.4 }}>{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 자세히 토글 */}
        <button onClick={() => setShowDetail(s => !s)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer', color: TkR.sub,
          fontSize: 13.5, fontWeight: 600, padding: 0, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: showDetail ? 16 : 0,
        }}>
          <span style={{ display: 'inline-flex', transition: 'transform 0.2s', transform: showDetail ? 'rotate(180deg)' : 'rotate(0)' }}>
            <IcoR name="chevD" size={14} />
          </span>
          {showDetail ? '간단히 보기' : '자세한 설명 보기'}
        </button>

        {showDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 8 }}>
            {/* 자세한 설명 */}
            <div>
              <CapR style={{ marginBottom: 12 }}>이 사료가 좋은 이유</CapR>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reason.detail_paragraphs.map((para, i) => (
                  <BodyR key={i} style={{ fontSize: 14.5, lineHeight: 1.75 }}
                    dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#000;background:#FBEFC1;padding:1px 4px;border-radius:3px">$1</strong>') }} />
                ))}
              </div>
            </div>

            {/* 주의 포인트 */}
            <div>
              <CapR style={{ marginBottom: 12 }}>주의 포인트</CapR>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reason.cautions.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: TkR.surface, borderRadius: 10 }}>
                    <span style={{ color: TkR.yellowDark, paddingTop: 1, flexShrink: 0 }}><IcoR name="warn" size={14} /></span>
                    <BodyR style={{ fontSize: 13.5, lineHeight: 1.55 }}>{c}</BodyR>
                  </div>
                ))}
              </div>
            </div>

            {/* 전환 plan */}
            <div>
              <CapR style={{ marginBottom: 12 }}>전환 가이드</CapR>
              <CR padding={0} style={{ overflow: 'hidden' }}>
                {reason.transition_plan.map((row, i) => (
                  <div key={row.day} style={{
                    display: 'grid', gridTemplateColumns: '110px 1fr 80px',
                    alignItems: 'center', padding: '12px 16px',
                    borderTop: i > 0 ? `1px solid ${TkR.border}` : 'none',
                  }}>
                    <SmR muted={false} style={{ fontWeight: 600 }}>{row.day}</SmR>
                    <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: TkR.border }}>
                      {row.current > 0 && (
                        <div style={{ width: `${row.current}%`, background: TkR.faint, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                          <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>현재 {row.current}%</span>
                        </div>
                      )}
                      {row.new > 0 && (
                        <div style={{ width: `${row.new}%`, background: food.accent === TkR.yellow ? TkR.yellowDark : TkR.blueDeep, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                          <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>추천 {row.new}%</span>
                        </div>
                      )}
                    </div>
                    <SmR style={{ textAlign: 'right' }}>
                      <MoR>{Math.round(row.new)}%</MoR>
                    </SmR>
                  </div>
                ))}
              </CR>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '0 28px 28px' }}>
        <BR variant="ghost" size="md" onClick={() => onCompare(food.id)} leading={<IcoR name="scale" size={16} />}>현재 사료와 비교</BR>
        <BR variant="dark" size="md">구매처 보기</BR>
        <div style={{ flex: 1 }} />
        <SmR>1kg <MoR>{food.price_per_kg.toLocaleString()}원</MoR></SmR>
      </div>
    </CR>
  );
}

// ─────────── RECOMMENDATION SCREEN ───────────
function RecommendationScreen({ profile, savedIds, onSave, onCompare, onEdit, reasonStyle }) {
  const recs = [DR.FOODS[0], DR.FOODS[1]];
  const currentFood = DR.FOODS.find(f => f.id === 'f-current');

  const ag = ageOfR(profile.birth_year);
  const conds = (profile.health_conditions || []).filter(c => c !== '질병 없음');
  const hasDisease = conds.length > 0;
  const goal = profile.goal;
  const isWeightUp = goal === '체중관리 - 증량';
  const isWeightDown = goal === '체중관리 - 감량';
  const isSeniorTransition = goal === '중노령 전환';
  const isWeightGoal = isWeightUp || isWeightDown;

  // Build priority order shown to user
  const priorityOrder = [];

  // Step 1: Age tier filter — shown for any cat 7+
  if (ag && ag.age >= 7) {
    priorityOrder.push({
      label: `${ag.group} 연령 적합 사료`,
      desc: `만 ${ag.age}살 → ${ag.label} 기준에 맞는 사료만 후보로 추려요`,
      primary: true,
      tone: 'blue',
    });
  }

  // Step 2: Disease (if any) — outranks weight goal
  if (hasDisease) {
    priorityOrder.push({
      label: '질환관리',
      desc: conds.join(', ') + (priorityOrder.length ? ' — 위 후보 중 안전한 사료만' : ''),
      primary: priorityOrder.length === 0,
      tone: 'yellow',
    });
  }

  // Step 3: Goal-based sort
  if (isWeightUp) {
    priorityOrder.push({
      label: '체중관리 - 증량',
      desc: '남은 후보를 칼로리 높은 순으로 정렬',
      tone: 'soft',
    });
  } else if (isWeightDown) {
    priorityOrder.push({
      label: '체중관리 - 감량',
      desc: '남은 후보를 칼로리 낮은 순으로 정렬',
      tone: 'soft',
    });
  } else if (isSeniorTransition && !ag) {
    priorityOrder.push({
      label: '중노령 전환',
      desc: '관절·신장·소화 부담 낮춘 사료 우선',
      primary: priorityOrder.length === 0,
      tone: 'yellow',
    });
  } else if (goal === '질환관리' && !hasDisease) {
    priorityOrder.push({
      label: '질환관리',
      desc: '진단이 없어도 부담 적은 사료 우선',
      primary: true,
      tone: 'yellow',
    });
  }

  return (
    <div style={{ background: TkR.bg, minHeight: 'calc(100vh - 68px)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px' }}>
        <CapR style={{ marginBottom: 12 }}>분석 완료 · 방금</CapR>
        <H1R style={{ marginBottom: 12, fontSize: 40 }}>{profile.name}에게 맞는 사료 두 가지</H1R>
        <BodyR muted style={{ marginBottom: 28, maxWidth: 640, fontSize: 16 }}>
          입력하신 프로필 기준으로 적합도가 가장 높은 두 가지예요. 위쪽일수록 더 적합해요.
        </BodyR>

        <ProfileBanner profile={profile} onEdit={onEdit} />

        {priorityOrder.length > 0 && (
          <CR padding={20} style={{ marginBottom: 24, background: TkR.card, borderColor: TkR.border }}>
            <CapR style={{ marginBottom: 12 }}>추천 우선순위</CapR>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {priorityOrder.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: p.primary ? TkR.text : TkR.surface,
                    color: p.primary ? '#fff' : TkR.sub,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 12,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <H4R style={{ fontSize: 15 }}>{p.label}</H4R>
                      {p.primary && <SmR muted={false} style={{ color: TkR.yellowDark, fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>주 기준</SmR>}
                    </div>
                    <SmR style={{ marginTop: 2 }}>{p.desc}</SmR>
                  </div>
                </div>
              ))}
            </div>
            {(hasDisease || isWeightGoal) && (
              <BodyR muted style={{ fontSize: 12.5, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${TkR.border}`, lineHeight: 1.55 }}>
                {profile.name}는 만 {ag?.age}살 {ag?.label}이고
                {hasDisease ? `, ${conds.join(', ')} 진단이 있어서` : ''}
                {' '}
                <strong style={{ color: TkR.text, fontWeight: 700 }}>
                  {ag && ag.age >= 7 ? `${ag.group} 적합 + ` : ''}
                  {hasDisease ? '질환 안전 사료들 중에서만' : '안전한 사료들 중에서'}
                </strong>
                {isWeightUp ? ` 칼로리 높은 순으로 ` : isWeightDown ? ` 칼로리 낮은 순으로 ` : ' '}
                골랐어요.
              </BodyR>
            )}
          </CR>
        )}

        {recs.map((f, i) => (
          <FoodRecCard key={f.id} rank={i + 1} food={f} reason={DR.REASONS[f.id]}
            saved={savedIds.includes(f.id)} onSave={() => onSave(f.id)}
            onCompare={onCompare} currentFood={currentFood}
            reasonStyle={reasonStyle} />
        ))}

        <CR padding={24} style={{ background: TkR.surface, borderColor: 'transparent', textAlign: 'center', marginTop: 16 }}>
          <H4R>추천 결과가 마음에 안 들어요?</H4R>
          <BodyR muted style={{ fontSize: 14, marginTop: 4, marginBottom: 16 }}>프로필을 다시 조정해 보세요. 가벼운 정보 변경만으로도 결과가 달라져요.</BodyR>
          <BR variant="ghost" size="md" onClick={onEdit}>프로필 다시 입력하기</BR>
        </CR>
      </div>
    </div>
  );
}

// ─────────── COMPARE SCREEN ───────────
function CompareScreen({ profile, currentFood, recFood, onBack, savedIds, onSave }) {
  return (
    <div style={{ background: TkR.bg, minHeight: 'calc(100vh - 68px)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 32px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6, color: TkR.sub, marginBottom: 20, fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
        }}><IcoR name="back" size={16} /> 추천 결과로 돌아가기</button>

        <CapR style={{ marginBottom: 12 }}>사료 비교</CapR>
        <H1R style={{ fontSize: 36, marginBottom: 12 }}>현재 사료 vs 추천 사료</H1R>
        <BodyR muted style={{ marginBottom: 32, fontSize: 16 }}>
          {profile.name} 기준 100g당 영양 성분 비교예요. <span style={{ color: TkR.blueDeep, fontWeight: 600 }}>● 표시된 항목</span>이 우리 아이에게 가장 영향이 큰 성분이에요.
        </BodyR>

        {/* Header 2 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <CompareHeaderCard food={currentFood} label="현재 사료" />
          <CompareHeaderCard food={recFood} label="추천 사료" highlight />
        </div>

        {/* Summary */}
        <CR padding={24} style={{ marginBottom: 24, background: TkR.blue, borderColor: 'transparent' }}>
          <CapR style={{ color: TkR.blueDeep, marginBottom: 8 }}>요약</CapR>
          <BodyR style={{ fontSize: 16, lineHeight: 1.65 }}>
            바꾸면 <strong style={{ color: TkR.blueDeep }}>인 {Math.round((1 - recFood.phosphorus/currentFood.phosphorus) * 100)}% ↓</strong>, 
            <strong style={{ color: TkR.blueDeep }}> 나트륨 {Math.round((1 - recFood.sodium/currentFood.sodium) * 100)}% ↓</strong>로 신장 부담이 크게 줄어요. 
            단백질은 살짝 줄지만 노령묘 기준에서는 충분한 수준이에요.
          </BodyR>
        </CR>

        {/* Nutrient Table */}
        <CR padding={0} style={{ overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 24px', background: TkR.surface, borderBottom: `1px solid ${TkR.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <H4R>성분 비교</H4R>
            <SmR>100g 기준</SmR>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: TkR.card }}>
                <th style={thStyle}>성분</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>현재</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>추천</th>
                <th style={{ ...thStyle, textAlign: 'right', width: 120 }}>변화</th>
              </tr>
            </thead>
            <tbody>
              {DR.NUTRIENT_ROWS.map(row => {
                const cv = currentFood[row.key];
                const nv = recFood[row.key];
                const diff = nv - cv;
                const improve = row.betterLow == null ? null : row.betterLow ? diff < 0 : diff > 0;
                const isHigh = row.importance === 'high';
                return (
                  <tr key={row.key} style={{ background: isHigh ? 'rgba(206,230,247,0.15)' : 'transparent', borderTop: `1px solid ${TkR.border}` }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{row.label}</span>
                        {isHigh && <span style={{ color: TkR.blueDeep, fontSize: 8 }}>●</span>}
                      </div>
                      {row.note && <div style={{ fontSize: 11, color: TkR.sub, marginTop: 2 }}>{row.note}</div>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <MoR style={{ fontSize: 15, color: TkR.sub }}>{cv}<span style={{ fontSize: 11, marginLeft: 1, fontWeight: 400 }}>{row.unit}</span></MoR>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <MoR style={{ fontSize: 15, fontWeight: 700, color: TkR.text }}>{nv}<span style={{ fontSize: 11, marginLeft: 1, fontWeight: 400, color: TkR.sub }}>{row.unit}</span></MoR>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <DiffBadge diff={diff} pct={cv === 0 ? null : (diff/cv)*100} improve={improve} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CR>

        {/* 급여량 / 비용 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          <CR padding={24}>
            <CapR style={{ marginBottom: 12 }}>하루 급여량 ({profile.weight}kg)</CapR>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
              <div>
                <SmR>현재</SmR>
                <H2R><MoR>{currentFood.rec_daily_g}</MoR><span style={{ fontSize: 14, color: TkR.sub, marginLeft: 4 }}>g</span></H2R>
              </div>
              <IcoR name="fwd" size={14} color={TkR.faint} />
              <div>
                <SmR muted={false} style={{ color: TkR.yellowDark, fontWeight: 700 }}>추천</SmR>
                <H2R><MoR>{recFood.rec_daily_g}</MoR><span style={{ fontSize: 14, color: TkR.sub, marginLeft: 4 }}>g</span></H2R>
              </div>
            </div>
          </CR>
          <CR padding={24}>
            <CapR style={{ marginBottom: 12 }}>월 예상 비용</CapR>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
              <div>
                <SmR>현재</SmR>
                <H2R><MoR>{Math.round(currentFood.rec_daily_g * 30 * currentFood.price_per_kg / 1000).toLocaleString()}</MoR><span style={{ fontSize: 14, color: TkR.sub, marginLeft: 4 }}>원</span></H2R>
              </div>
              <IcoR name="fwd" size={14} color={TkR.faint} />
              <div>
                <SmR muted={false} style={{ color: TkR.yellowDark, fontWeight: 700 }}>추천</SmR>
                <H2R><MoR>{Math.round(recFood.rec_daily_g * 30 * recFood.price_per_kg / 1000).toLocaleString()}</MoR><span style={{ fontSize: 14, color: TkR.sub, marginLeft: 4 }}>원</span></H2R>
              </div>
            </div>
          </CR>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <BR variant="ghost" full onClick={() => onSave(recFood.id)}>
            {savedIds.includes(recFood.id) ? '저장됨' : '저장하기'}
          </BR>
          <BR variant="dark" full>구매처 보기</BR>
        </div>
      </div>
    </div>
  );
}

const thStyle = { padding: '14px 24px', fontSize: 12, fontWeight: 600, color: TkR.sub, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', borderBottom: `1px solid ${TkR.border}` };
const tdStyle = { padding: '14px 24px', verticalAlign: 'middle' };

function CompareHeaderCard({ food, label, highlight }) {
  return (
    <CR padding={20} style={highlight ? { borderColor: TkR.text, borderWidth: 1.5 } : undefined}>
      <CapR style={{ marginBottom: 12, color: highlight ? TkR.yellowDark : TkR.sub, fontWeight: 700 }}>{label}</CapR>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <FaR accent={food.accent} label={food.category} size={64} brand={food.brand} image={food.image} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SmR style={{ fontWeight: 600 }}>{food.brand}</SmR>
          <H4R style={{ marginTop: 2 }}>{food.product_name}</H4R>
        </div>
      </div>
    </CR>
  );
}

function DiffBadge({ diff, pct, improve }) {
  if (Math.abs(diff) < 0.01) return <span style={{ color: TkR.faint, fontSize: 12 }}>=</span>;
  const color = improve == null ? TkR.sub : improve ? TkR.green : TkR.danger;
  const bg = improve == null ? TkR.surface : improve ? TkR.greenSoft : TkR.dangerSoft;
  const arrow = diff > 0 ? '↑' : '↓';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 8, background: bg, color,
      fontSize: 12, fontWeight: 700,
    }}>
      <MoR>{arrow} {pct != null ? `${Math.abs(Math.round(pct))}%` : Math.abs(diff).toFixed(2)}</MoR>
    </span>
  );
}

// ─────────── APP ROOT ───────────
function App() {
  const [route, setRoute] = uS('landing');
  const [route_visited_rec, setRouteVisitedRec] = uS(false);
  const [profileDraft, setProfileDraft] = uS({});
  const [savedProfile, setSavedProfile] = uS(null);
  const [savedIds, setSavedIds] = uS([]);
  const [compareRecId, setCompareRecId] = uS('f-kidney-dry');

  // Tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "profileUX": "단계별",
    "reasonStyle": "둘 다",
    "accentColor": "#F1F41E",
    "softColor": "#CEE6F7"
  }/*EDITMODE-END*/;
  const [t, setT] = window.useTweaks(TWEAK_DEFAULTS);

  uE(() => {
    window.WG.T.yellow = t.accentColor;
    window.WG.T.blue = t.softColor;
  }, [t.accentColor, t.softColor]);
  // Apply synchronously during render so children pick up the new value this pass.
  window.WG.T.yellow = t.accentColor;
  window.WG.T.blue = t.softColor;

  const startProfile = () => {
    setProfileDraft({});
    setRoute('profile');
  };
  const demoFlow = () => {
    const seed = { ...DR.CAT_PRESET };
    setProfileDraft(seed);
    setSavedProfile(seed);
    setSavedIds(['f-kidney-dry']);
    setRoute('rec');
  };
  const submitProfile = () => {
    setSavedProfile({ ...profileDraft });
    setRoute('cat');
  };
  const toggleSave = id => setSavedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const goCompare = id => { setCompareRecId(id); setRoute('compare'); };

  const profileToShow = savedProfile || profileDraft;

  // body
  let body;
  if (route === 'landing') body = <window.WG_LANDING onStart={startProfile} onDemo={demoFlow} />;
  else if (route === 'profile') {
    const variantMap = {
      '단계별': window.WG_PROFILE.ProfileSteppedScreen,
      '단일 페이지': window.WG_PROFILE.ProfileOnePageScreen,
      '챗봇형': window.WG_PROFILE.ProfileChatScreen,
    };
    const Comp = variantMap[t.profileUX] || window.WG_PROFILE.ProfileSteppedScreen;
    body = <Comp profile={profileDraft} setProfile={setProfileDraft}
            onSubmit={submitProfile} onClose={() => setRoute('landing')} />;
  }
  else if (route === 'rec') body = <RecommendationScreen profile={profileToShow} savedIds={savedIds}
    onSave={toggleSave} onCompare={goCompare} onEdit={() => setRoute('profile')} reasonStyle={t.reasonStyle} />;
  else if (route === 'compare') {
    const rec = DR.FOODS.find(f => f.id === compareRecId) || DR.FOODS[0];
    const cur = DR.FOODS.find(f => f.id === 'f-current');
    body = <CompareScreen profile={profileToShow} currentFood={cur} recFood={rec}
      onBack={() => setRoute('rec')} savedIds={savedIds} onSave={toggleSave} />;
  }
  else if (route === 'cat') {
    body = <window.WG_CAT
      profile={profileToShow}
      isFirstTime={!savedIds.length && !route_visited_rec}
      onBack={() => setRoute(savedProfile ? 'rec' : 'landing')}
      onSeeRecs={() => { setRouteVisitedRec(true); setRoute('rec'); }}
      onEdit={() => setRoute('profile')}
    />;
  }

  return (
    <div data-screen-label={`screen-${route}`}>
      <window.WG_NAV route={route} onRoute={setRoute} hasProfile={!!savedProfile} />
      {body}

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="추천 화면">
          <window.TweakRadio label="추천 이유 표시" value={t.reasonStyle}
            options={['자연어', '체크리스트', '둘 다']}
            onChange={v => setT('reasonStyle', v)} />
        </window.TweakSection>
        <window.TweakSection label="컬러">
          <window.TweakColor label="포인트 (CTA·강조)" value={t.accentColor}
            options={['#F1F41E', '#F6CC46', '#F08A5D', '#7AB8A1', '#A89BE3']}
            onChange={v => setT('accentColor', v)} />
          <window.TweakColor label="보조 (칩·요약)" value={t.softColor}
            options={['#CEE6F7', '#FCE7E0', '#E2EFE6', '#EFEAFA']}
            onChange={v => setT('softColor', v)} />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

window.WG_APP = App;
window.WG_RECOMMENDATION = RecommendationScreen;
window.WG_COMPARE = CompareScreen;
