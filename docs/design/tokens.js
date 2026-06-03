// 완그릇 — Tokens, primitives, icons. Plain JS, attaches to window.WG.

window.WG = (function () {
  const T = {
    bg: '#FAFAF6',           // warm off-white page bg
    surface: '#F4F1E8',      // slightly creamier
    surfaceAlt: '#EFEBE0',
    card: '#FFFFFF',
    text: '#101411',
    sub: '#6A716E',
    faint: '#A3A6A1',
    border: '#E6E2D6',
    borderStrong: '#D3CDBE',
    blue: '#CEE6F7',
    blueInk: '#1E5A86',
    blueDeep: '#0F3D62',
    yellow: '#F6CC46',
    yellowDark: '#9C7A14',
    yellowSoft: '#FBEFC1',
    green: '#3F8F5D',
    greenSoft: '#E2EFE6',
    danger: '#C24B3A',
    dangerSoft: '#F9E2DD',
  };

  // Icons — return SVG strings used via dangerouslySetInnerHTML, simpler than JSX in plain JS
  const ICON = {
    back: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fwd:  '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check:'<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 6-7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L13 12H1L7 1.5z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M7 6v3M7 10.5v0.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    spark:'<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2l1.8 5.2L18 9l-5.2 1.8L11 16l-1.8-5.2L4 9l5.2-1.8L11 2z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>',
    bowl: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 9h18v2c0 4.4-3.6 8-8 8h-2c-4.4 0-8-3.6-8-8V9z" fill="currentColor"/><circle cx="8" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="4" r="1.4" fill="currentColor"/><circle cx="15.5" cy="6" r="1.4" fill="currentColor"/></svg>',
    paw:  '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="5" cy="7" r="1.6" fill="currentColor"/><circle cx="9" cy="5" r="1.6" fill="currentColor"/><circle cx="13" cy="5" r="1.6" fill="currentColor"/><circle cx="17" cy="7" r="1.6" fill="currentColor"/><path d="M11 9c-3 0-5 2.5-5 5 0 1.5 1 2.5 2.5 2.5 1 0 1.5-0.5 2.5-0.5s1.5 0.5 2.5 0.5c1.5 0 2.5-1 2.5-2.5 0-2.5-2-5-5-5z" fill="currentColor"/></svg>',
    chevR:'<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevD:'<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    info: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M7 6v4M7 4.2v0.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    drop: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2c0 0 5 5 5 9 0 3-2.2 5-5 5s-5-2-5-5c0-4 5-9 5-9z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>',
    leaf: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 17C3 9 9 3 17 3c0 8-6 14-14 14z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M3 17L10 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    heart:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 17S3 12.5 3 7.5C3 5 5 3 7.5 3c1.5 0 2.5 0.8 2.5 0.8S11 3 12.5 3C15 3 17 5 17 7.5c0 5-7 9.5-7 9.5z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>',
    scale:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 5h12M10 5v12M4 17h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="5" cy="9" r="2.5" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="15" cy="9" r="2.5" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  };

  function ageGroupFromBirth(year) {
    if (!year) return null;
    const age = new Date().getFullYear() - parseInt(year, 10);
    if (isNaN(age) || age < 0 || age > 30) return null;
    let group = '성묘', label = '성묘';
    if (age >= 15) { group = '15+'; label = '초고령'; }
    else if (age >= 11) { group = '11+'; label = '고령'; }
    else if (age >= 7) { group = '7+'; label = '중년'; }
    else if (age >= 1) { group = '1+'; label = '성묘'; }
    return { age, group, label };
  }

  return { T, ICON, ageGroupFromBirth };
})();
