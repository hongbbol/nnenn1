// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useGuestStore } from './guest-store';

/** 계정 전환 시 게스트 스토어 리셋(2026-10-22 — 다른 계정의 입력이 새 계정에 딸려오던 버그). */
describe('guest-store ownerId 동기화', () => {
  beforeEach(() => {
    localStorage.clear();
    useGuestStore.setState({ ownerId: null, cat: { health_conditions: [], avoid_ingredients: [], exclude_food_ids: [] }, editingCatId: null, editMode: false, demoMode: false });
  });

  it('같은 사용자면 입력을 유지한다', () => {
    const s = useGuestStore.getState();
    s.syncOwner('user-a');
    s.setCat({ name: '낭낭', birth_year: 2010 });
    s.syncOwner('user-a');
    expect(useGuestStore.getState().cat.name).toBe('낭낭');
    expect(useGuestStore.getState().ownerId).toBe('user-a');
  });

  it('다른 사용자로 바뀌면 입력·편집 상태를 전부 비운다', () => {
    const s = useGuestStore.getState();
    s.syncOwner('user-a');
    s.setCat({ name: '낭낭', birth_year: 2010, health_conditions: ['신부전 초기'] });
    s.setEditingCatId('cat-1');
    s.setEditMode(true);
    s.syncOwner('user-b');
    const st = useGuestStore.getState();
    expect(st.cat.name).toBeUndefined();
    expect(st.cat.health_conditions).toEqual([]);
    expect(st.editingCatId).toBeNull();
    expect(st.editMode).toBe(false);
    expect(st.ownerId).toBe('user-b');
  });

  it('로그아웃(null)도 리셋으로 취급한다', () => {
    const s = useGuestStore.getState();
    s.syncOwner('user-a');
    s.setCat({ name: '낭낭' });
    s.syncOwner(null);
    expect(useGuestStore.getState().cat.name).toBeUndefined();
    expect(useGuestStore.getState().ownerId).toBeNull();
  });

  it('구버전(ownerId 없음) 저장분은 첫 동기화에서 비워진다', () => {
    useGuestStore.setState({ ownerId: null, cat: { name: '잔존', health_conditions: [], avoid_ingredients: [], exclude_food_ids: [] } });
    useGuestStore.getState().syncOwner('user-kakao');
    expect(useGuestStore.getState().cat.name).toBeUndefined();
  });
});
