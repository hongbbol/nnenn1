'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Chip, Input } from '@/components/ui';
import { filterFoodOptions, type FoodOption } from '@/lib/recommendation';

type Props = {
  options: FoodOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

/**
 * 사료 검색형 선택 — 타이핑하면 일치 항목이 드롭다운으로 뜨고, 고르면 아래에
 * 제거 가능한 칩으로 누적된다. 수백 개여도 화면이 길어지지 않는다.
 * 소스 비의존(controlled): 옵션은 prop으로 받는다.
 */
export function FoodSearchSelect({ options, selectedIds, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 이미 선택된 항목은 후보에서 제외.
  const matches = useMemo(
    () => filterFoodOptions(options, query).filter((o) => !selectedSet.has(o.id)),
    [options, query, selectedSet],
  );

  const selectedOptions = useMemo(
    () => selectedIds.map((id) => options.find((o) => o.id === id)).filter(Boolean) as FoodOption[],
    [selectedIds, options],
  );

  // 쿼리가 바뀌면 하이라이트 초기화.
  useEffect(() => setHighlight(0), [query]);

  // 바깥 클릭 시 닫기.
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  function add(id: string) {
    if (selectedSet.has(id)) return;
    onChange([...selectedIds, id]);
    setQuery('');
    setOpen(false);
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
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
      const pick = matches[highlight];
      if (pick) add(pick.id);
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <Input
        size="md"
        value={query}
        placeholder="제품명 또는 브랜드로 검색"
        suffix={<Search size={16} className="text-brand-faint" />}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="food-search-listbox"
      />

      {showDropdown && (
        <ul
          id="food-search-listbox"
          role="listbox"
          className="absolute z-10 mt-1.5 max-h-64 w-full overflow-auto rounded-[14px] border-[1.5px] border-border-soft bg-surface-card py-1.5 shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-2.5 text-[14px] text-brand-faint">검색 결과가 없어요</li>
          ) : (
            matches.map((o, i) => (
              <li key={o.id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  // mousedown으로 처리해 input blur보다 먼저 선택되게 한다.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(o.id);
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
            ))
          )}
        </ul>
      )}

      {selectedOptions.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-[12px] text-brand-sub">{selectedOptions.length}개 제외 중</div>
          <div className="flex flex-wrap gap-2">
            {selectedOptions.map((o) => (
              <Chip
                key={o.id}
                selected
                leading={<X size={12} />}
                onClick={() => remove(o.id)}
                aria-label={`${o.brand} ${o.productName} 제외 해제`}
              >
                {o.brand} · {o.productName}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
