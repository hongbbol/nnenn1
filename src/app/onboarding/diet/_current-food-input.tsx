'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui';
import { filterFoodOptions, foodOptionLabel, type FoodOption } from '@/lib/recommendation';

type Props = {
  options: FoodOption[];
  /** 자유 입력 텍스트(표시값). DB 선택 시에도 라벨이 여기 들어간다. */
  text: string;
  /** DB foods와 연결된 id. 자유 입력이면 null. */
  foodId: string | null;
  onChange: (patch: { text: string; foodId: string | null }) => void;
};

/**
 * "지금 먹이는 사료" 입력 — 타이핑하면 DB 사료가 드롭다운으로 뜨고, 고르면 foodId가
 * 연결돼 비교(baseline)에 영양 데이터가 쓰인다. 목록에 없으면 자유 입력 그대로 저장
 * (foodId=null → current_food_text). 텍스트를 다시 수정하면 연결이 풀린다.
 */
export function CurrentFoodInput({ options, text, foodId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // 이미 DB에 연결됐으면(선택 직후) 같은 라벨로 재검색해 드롭다운이 다시 뜨지 않게 한다.
  const matches = useMemo(
    () => (foodId ? [] : filterFoodOptions(options, text)),
    [options, text, foodId],
  );

  useEffect(() => setHighlight(0), [text]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  function pick(o: FoodOption) {
    onChange({ text: foodOptionLabel(o), foodId: o.id });
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!matches.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = matches[highlight];
      if (p) pick(p);
    }
  }

  const showDropdown = open && matches.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <Input
        value={text}
        placeholder="브랜드 또는 제품명"
        suffix={
          foodId ? (
            <Check size={16} className="text-brand-green" />
          ) : (
            <Search size={16} className="text-brand-faint" />
          )
        }
        onChange={(e) => {
          // 수정하면 DB 연결 해제 — 자유 입력으로 되돌아간다.
          onChange({ text: e.target.value, foodId: null });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="current-food-listbox"
      />

      {showDropdown && (
        <ul
          id="current-food-listbox"
          role="listbox"
          className="absolute z-10 mt-1.5 max-h-64 w-full overflow-auto rounded-[14px] border-[1.5px] border-border-soft bg-surface-card py-1.5 shadow-lg"
        >
          {matches.map((o, i) => (
            <li key={o.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                // mousedown으로 처리해 input blur보다 먼저 선택되게 한다.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={
                  'flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors ' +
                  (i === highlight ? 'bg-surface-1' : 'hover:bg-surface-1')
                }
              >
                <span className="text-[14px] font-medium text-brand-text">{o.productName}</span>
                <span className="text-[12px] text-brand-sub">
                  {o.brand} · {o.category}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
