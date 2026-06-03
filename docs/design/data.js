// 완그릇 — sample data. Plain JS so load order is reliable.

window.WG_DATA = (function () {
  const FOODS = [
    {
      id: 'f-kidney-dry',
      brand: '퓨어캐트',
      product_name: '키드니 케어 시니어 7+',
      category: '건식',
      age_fit: ['7+', '9+', '11+'],
      condition_fit: ['신부전 초기', '신부전 1-2기', '신부전 3-4기'],
      // per 100g / dry-matter basis
      protein: 32, fat: 16, fiber: 4, ash: 5.5, moisture: 8,
      phosphorus: 0.55, sodium: 0.22, omega3: 0.9, kcal: 392,
      ingredient_summary: '닭·계란 단백, 저인·저나트륨 포뮬러, 오메가-3 강화',
      form: '소형 알갱이 (직경 8mm)',
      rec_daily_g: 55,
      tags: ['저인', '저나트륨', '오메가-3', '7+'],
      accent: '#CEE6F7',
      price_per_kg: 28000,
      image: 'assets/food-orijen-kitten.webp',
    },
    {
      id: 'f-kidney-wet',
      brand: '베라뉴트',
      product_name: '하이드라 키드니 파우치',
      category: '습식',
      age_fit: ['7+', '9+', '11+'],
      condition_fit: ['신부전 초기', '신부전 1-2기', '신부전 3-4기', '식욕부진'],
      protein: 10.5, fat: 4.8, fiber: 0.6, ash: 1.9, moisture: 80,
      phosphorus: 0.18, sodium: 0.08, omega3: 0.3, kcal: 92,
      ingredient_summary: '수분 80% 파우치, 닭가슴살·호박 베이스, 인 0.18%',
      form: '85g 파우치 (1일 2~3개)',
      rec_daily_g: 175,
      tags: ['수분 보충', '저인', '기호성'],
      accent: '#F6CC46',
      price_per_kg: 32000,
      image: null,
    },
    {
      id: 'f-current',
      brand: '메이트홈',
      product_name: '데일리 인도어 어덜트',
      category: '건식',
      age_fit: ['1+'],
      condition_fit: [],
      protein: 31, fat: 15, fiber: 3.5, ash: 7.5, moisture: 8,
      phosphorus: 1.15, sodium: 0.42, omega3: 0.15, kcal: 405,
      ingredient_summary: '일반 성묘용 인도어 포뮬러',
      form: '중형 알갱이',
      rec_daily_g: 60,
      tags: ['일반 성묘'],
      accent: '#E5E7EB',
      price_per_kg: 21000,
      image: null,
    },
  ];

  // 자세하고 친절한 추천 설명
  const REASONS = {
    'f-kidney-dry': {
      headline: '9살 초기 신부전에 부담이 가장 적은 사료예요',
      summary: '인 0.55%와 저나트륨으로 신장 부담을 줄이면서, 단백질은 32%로 노령묘 근육 유지에 충분해요. 오메가-3 강화로 신장·관절을 함께 챙길 수 있어요.',
      checks: [
        { ok: true, label: '인 0.55%', detail: '일반 사료(1.15%) 대비 절반 수준' },
        { ok: true, label: '7+ 연령에 맞춘 단백 32%', detail: '근손실 방지에 충분한 양' },
        { ok: true, label: '저나트륨 0.22%', detail: '신장·심장 부담 ↓' },
        { ok: true, label: '오메가-3 0.9%', detail: '신장 기능 보조에 도움' },
        { ok: false, label: '음수량 보완 필요', detail: '건식이라 따로 물그릇 관리 필수' },
      ],
      detail_paragraphs: [
        '신부전이 시작된 고양이에게 가장 중요한 영양 조절 포인트는 **인(P) 함량**이에요. 인이 많으면 손상된 신장이 그만큼 더 일을 해야 하거든요. 현재 먹고 있는 사료의 인은 1.15%인데, 이 사료는 0.55%로 절반 수준이에요.',
        '단백질은 32%로 7+ 연령 기준에서 충분히 좋은 수준이에요. 과거에는 신부전 = 무조건 저단백이 정답이었지만, 최근 가이드는 "양보다 질"이에요. 닭가슴살과 계란 단백 위주로 흡수율이 높아서 적은 양으로도 근육을 유지할 수 있어요.',
        '오메가-3가 0.9% 들어있는데, 신장 사구체의 염증을 가라앉히는 효과가 알려져 있어요. 노령묘 관절에도 좋아요.',
      ],
      cautions: [
        '건식이기 때문에 음수량이 부족하면 안 돼요. 정수기 모양 자동급수기나 여러 위치의 물그릇 추천드려요.',
        '기존 사료에서 바꿀 때는 7~10일에 걸쳐 천천히 섞어주세요. 1~2일: 25%, 3~4일: 50%, 5~7일: 75%, 8일~: 100%.',
        '3~6개월 간격으로 혈액 검사(BUN, 크레아티닌, SDMA, 인 수치)를 받으셔야 해요.',
      ],
      transition_plan: [
        { day: '1~2일차', current: 75, new: 25 },
        { day: '3~4일차', current: 50, new: 50 },
        { day: '5~7일차', current: 25, new: 75 },
        { day: '8일차~', current: 0, new: 100 },
      ],
    },
    'f-kidney-wet': {
      headline: '수분을 많이 못 마시는 아이라면 습식과 병행을 권해요',
      summary: '수분 80% 파우치라 음수량을 자연스럽게 늘려줘요. 인 0.18%로 매우 낮고 기호성도 좋아서, 식욕이 떨어지기 시작한 노령묘에게 적합해요.',
      checks: [
        { ok: true, label: '수분 80%', detail: '음수량 부족 해소' },
        { ok: true, label: '인 0.18% (매우 낮음)', detail: '신장 부담 최소' },
        { ok: true, label: '기호성 높은 파우치 형태', detail: '식욕 자극' },
        { ok: false, label: '칼로리 92kcal/100g', detail: '단독 급여 시 양이 많이 필요해요' },
      ],
      detail_paragraphs: [
        '고양이는 야생 시절부터 물을 자주 마시지 않고 먹이에서 수분을 얻도록 진화했어요. 그래서 건식만 먹는 아이는 만성적으로 수분이 부족하기 쉬워요. 신부전이 진행되면 이게 더 큰 부담이 돼요.',
        '이 파우치는 수분이 80%여서 한 끼만 먹어도 음수량을 50~70ml 정도 보충해줘요. 인 함량도 0.18%로 매우 낮아 신장에 대한 부담이 가장 적은 옵션이에요.',
        '다만 칼로리가 낮아서 습식 단독으로는 양이 많이 필요해요. 위 추천 1번 건식과 50:50으로 섞어 급여하는 것이 가장 균형적이에요.',
      ],
      cautions: [
        '단독 급여보다는 건식과 50:50 혼합을 권장해요.',
        '개봉 후 24시간 내에 급여하시고, 남으면 냉장 보관 후 살짝 데워서 주세요.',
        '습식만으로는 치아에 잔여물이 남기 쉬우니 양치 또는 치아 관리 간식 병행이 좋아요.',
      ],
      transition_plan: [
        { day: '1~3일차', current: 80, new: 20 },
        { day: '4~6일차', current: 50, new: 50 },
        { day: '7일차~', current: 30, new: 70 },
      ],
    },
  };

  const CAT_PRESET = {
    name: '보리',
    birth_year: 2017,
    age: 9,
    age_group: '7+',
    weight: 4.7,
    neutered: true,
    neutered_label: '완료',
    diet_type: '건식',
    current_food_id: 'f-current',
    current_food: '메이트홈 데일리 인도어',
    health_conditions: ['신부전 초기'],
    avoid_ingredients: [],
    goal: '질환관리',
  };

  const HEALTH_OPTIONS = [
    { id: '질병 없음', desc: '특별한 진단 없이 건강해요', exclusive: true },
    { id: '신부전 초기', desc: 'BUN/크레아티닌 가벼운 상승', group: 'kidney' },
    { id: '신부전 1-2기', desc: 'IRIS 1~2단계 · 조기 관리', group: 'kidney' },
    { id: '신부전 3-4기', desc: 'IRIS 3~4단계 · 치료식 필요', group: 'kidney' },
    { id: '당뇨', desc: '인슐린 또는 식이 조절' },
    { id: '결석 - 스트루바이트', desc: '용해 가능 · pH 산성화 사료', group: 'stone' },
    { id: '결석 - 옥살레이트', desc: '용해 불가 · 예방·관리 중심', group: 'stone' },
    { id: 'IBD', desc: '염증성 장 질환' },
    { id: '췌장염', desc: '저지방 필요' },
  ];

  const GOAL_OPTIONS = [
    { id: '질환관리', desc: '진단받은 질환에 맞춰' },
    { id: '중노령 전환', desc: '관절·신장·소화 부담 ↓' },
    { id: '체중관리 - 감량', desc: '저칼로리·고단백' },
    { id: '체중관리 - 증량', desc: '고열량·기호성' },
  ];

  const DIET_OPTIONS = ['건식', '습식', '혼합'];

  return {
    FOODS, REASONS, CAT_PRESET,
    HEALTH_OPTIONS, GOAL_OPTIONS, DIET_OPTIONS,
    NUTRIENT_ROWS: [
      { key: 'protein', label: '조단백', unit: '%', betterLow: false, importance: 'mid' },
      { key: 'fat', label: '조지방', unit: '%', betterLow: false, importance: 'mid' },
      { key: 'phosphorus', label: '인', unit: '%', betterLow: true, importance: 'high', note: '신장 부담' },
      { key: 'sodium', label: '나트륨', unit: '%', betterLow: true, importance: 'high', note: '심·신장' },
      { key: 'fiber', label: '식이섬유', unit: '%', betterLow: false, importance: 'low' },
      { key: 'ash', label: '회분', unit: '%', betterLow: true, importance: 'low' },
      { key: 'moisture', label: '수분', unit: '%', betterLow: false, importance: 'mid' },
      { key: 'omega3', label: '오메가-3', unit: '%', betterLow: false, importance: 'mid' },
      { key: 'kcal', label: '칼로리', unit: 'kcal/100g', betterLow: null, importance: 'mid' },
    ],
  };
})();
