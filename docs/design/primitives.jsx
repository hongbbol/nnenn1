// 완그릇 — main React app. Desktop-first responsive prototype.
// All component definitions in one Babel script; references window.WG_DATA + window.WG.

const { T, ICON, ageGroupFromBirth } = window.WG;
const D = window.WG_DATA;
const { useState, useEffect, useRef, useMemo, Fragment } = React;

// ─────────────── PRIMITIVES ───────────────
const Icon = ({ name, size, color, style }) =>
<span style={{
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  color: color || 'currentColor', flexShrink: 0,
  width: size, height: size,
  ...style
}} dangerouslySetInnerHTML={{ __html: ICON[name] || '' }} />;


const H1 = ({ children, style }) => <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.2, color: T.text, ...style, fontFamily: "Pretendard" }}>{children}</div>;
const H2 = ({ children, style }) => <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.6, color: T.text, ...style }}>{children}</div>;
const H3 = ({ children, style }) => <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.3, color: T.text, ...style }}>{children}</div>;
const H4 = ({ children, style }) => <div style={{ fontWeight: 600, lineHeight: 1.35, letterSpacing: -0.2, color: T.text, ...style, fontSize: "18px" }}>{children}</div>;
const Body = ({ children, style, muted }) => <div style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: muted ? T.sub : T.text, ...style }}>{children}</div>;
const Small = ({ children, style, muted = true }) => <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: muted ? T.sub : T.text, ...style }}>{children}</div>;
const Caption = ({ children, style }) => <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: T.sub, ...style }}>{children}</div>;
const Mono = ({ children, style }) => <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', ...style }}>{children}</span>;

function Button({ children, onClick, variant = 'primary', size = 'lg', disabled, full, leading, trailing, style }) {
  const sizes = {
    lg: { height: 52, padding: '0 24px', fontSize: 15.5, borderRadius: 14 },
    md: { height: 42, padding: '0 18px', fontSize: 14, borderRadius: 12 },
    sm: { height: 34, padding: '0 14px', fontSize: 13, borderRadius: 10 }
  };
  const variants = {
    primary: { background: T.yellow, color: T.text, border: `1px solid ${T.yellow}`, boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 8px 18px -10px rgba(180,140,30,0.45)' },
    dark: { background: T.text, color: '#fff', border: `1px solid ${T.text}` },
    blue: { background: T.blue, color: T.blueDeep, border: `1px solid ${T.blue}` },
    ghost: { background: T.card, color: T.text, border: `1px solid ${T.border}` },
    soft: { background: T.surface, color: T.text, border: `1px solid transparent` },
    text: { background: 'transparent', color: T.sub, border: 'none', boxShadow: 'none' }
  };
  return (
    <button onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: 'inherit', fontWeight: 600, letterSpacing: -0.2, cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'transform 0.08s, opacity 0.15s, background 0.15s',
      opacity: disabled ? 0.45 : 1, width: full ? '100%' : 'auto',
      ...sizes[size], ...variants[variant], ...style
    }}
    onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.985)')}
    onMouseUp={(e) => e.currentTarget.style.transform = ''}
    onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
      {leading}{children}{trailing}
    </button>);

}

function Card({ children, style, padding = 24, onClick, hoverable }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick}
    onMouseEnter={() => hoverable && setHover(true)}
    onMouseLeave={() => hoverable && setHover(false)}
    style={{
      background: T.card, borderRadius: 20, padding,
      border: `1px solid ${T.border}`,
      boxShadow: hover ? '0 6px 24px -8px rgba(20,16,8,0.08), 0 1px 0 rgba(0,0,0,0.02)' : '0 1px 0 rgba(0,0,0,0.02)',
      transition: 'box-shadow 0.18s, transform 0.18s, border-color 0.18s',
      cursor: onClick ? 'pointer' : 'default',
      position: 'relative',
      ...style
    }}>
      {children}
    </div>);

}

function Chip({ children, selected, onClick, variant = 'default', size = 'md', leading, style }) {
  const sizes = {
    sm: { fontSize: 12, padding: '5px 9px', borderRadius: 7, height: 24 },
    md: { fontSize: 13, padding: '7px 12px', borderRadius: 9, height: 30 },
    lg: { fontSize: 14, padding: '10px 14px', borderRadius: 11, height: 38 }
  };
  const variants = {
    default: selected ?
    { background: T.text, color: '#fff', border: `1px solid ${T.text}` } :
    { background: T.card, color: T.text, border: `1px solid ${T.border}` },
    blue: { background: T.blue, color: T.blueDeep, border: '1px solid transparent' },
    yellow: { background: T.yellowSoft, color: T.yellowDark, border: '1px solid transparent' },
    soft: { background: T.surface, color: T.sub, border: '1px solid transparent' },
    ok: { background: T.greenSoft, color: T.green, border: '1px solid transparent' },
    danger: { background: T.dangerSoft, color: T.danger, border: '1px solid transparent' }
  };
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
      fontFamily: 'inherit', fontWeight: 500, letterSpacing: -0.1, cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.12s', ...sizes[size], ...variants[variant], ...style, border: "1px solid rgb(162, 162, 162)", background: "rgb(246, 246, 241)"
    }}>
      {leading}{children}
    </button>);

}

function Input({ value, onChange, placeholder, suffix, autoFocus, inputMode, type = 'text', size = 'lg' }) {
  const heights = { lg: 52, md: 44 };
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: T.card, borderRadius: 14,
      border: `1.5px solid ${focus ? T.text : T.border}`,
      padding: '0 16px', height: heights[size],
      transition: 'border-color 0.15s'
    }}>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      type={type} inputMode={inputMode} autoFocus={autoFocus}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        flex: 1, border: 'none', outline: 'none', background: 'transparent',
        fontSize: 16, fontFamily: 'inherit', fontWeight: 500, color: T.text, minWidth: 0
      }} />
      {suffix && <span style={{ color: T.sub, fontSize: 14, fontWeight: 500 }}>{suffix}</span>}
    </div>);

}

function Segmented({ options, value, onChange, size = 'md' }) {
  const h = size === 'lg' ? 52 : 44;
  return (
    <div style={{ display: 'inline-flex', background: T.surface, borderRadius: 12, padding: 4, gap: 4, height: h + 8 }}>
      {options.map((opt) => {
        const sel = value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            flex: '1 0 auto', minWidth: 80, height: h, padding: '0 16px',
            borderRadius: 9, border: 'none',
            background: sel ? T.card : 'transparent',
            color: sel ? T.text : T.sub, fontWeight: sel ? 600 : 500,
            fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: sel ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s'
          }}>{opt}</button>);

      })}
    </div>);

}

function Stepper({ current, steps }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: active || done ? 1 : 0.5 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: active ? T.text : done ? T.text : T.border,
                color: active || done ? '#fff' : T.sub,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12
              }}>{done ? <Icon name="check" size={12} /> : i + 1}</div>
              <Small muted={!active} style={{ fontWeight: active ? 600 : 500, color: active ? T.text : T.sub }}>{s.label}</Small>
            </div>
            {i < steps.length - 1 &&
            <div style={{ flex: 1, height: 2, background: i < current ? T.text : T.border, borderRadius: 2, transition: 'background 0.3s' }} />
            }
          </Fragment>);

      })}
    </div>);

}

function CatAvatar({ size = 56, name = '?', accent = T.blue }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: accent, color: T.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, letterSpacing: -0.5, flexShrink: 0
    }}>{(name || '?').slice(0, 1)}</div>);

}

function FoodArt({ accent = T.blue, label = '건식', size = 96, brand = '', image = null }) {
  if (image) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 18, flexShrink: 0,
        background: '#FFFFFF',
        border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', padding: Math.round(size * 0.06)
      }}>
        <img src={image} alt={brand} style={{
          maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
          display: 'block', mixBlendMode: 'multiply'
        }} />
      </div>);

  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 18, flexShrink: 0,
      background: `repeating-linear-gradient(135deg, ${accent} 0 10px, rgba(255,255,255,0.55) 10px 20px)`,
      border: `1px solid ${T.border}`, position: 'relative',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 10
    }}>
      <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 600,
        color: T.text, letterSpacing: 0.5, background: 'rgba(255,255,255,0.85)',
        padding: '3px 6px', borderRadius: 4
      }}>{label}</div>
    </div>);

}

Object.assign(window, { Icon, H1, H2, H3, H4, Body, Small, Caption, Mono, Button, Card, Chip, Input, Segmented, Stepper, CatAvatar, FoodArt });