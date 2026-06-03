import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // semantic prefix to avoid clashes with Tailwind defaults — mirrors docs/design/tokens.js
        'brand-bg': '#FAFAF6',
        'brand-text': '#101411',
        'brand-sub': '#6A716E',
        'brand-faint': '#A3A6A1',
        'brand-yellow': '#F6CC46',
        'brand-yellow-dark': '#9C7A14',
        'brand-yellow-soft': '#FBEFC1',
        'brand-blue': '#CEE6F7',
        'brand-blue-ink': '#1E5A86',
        'brand-blue-deep': '#0F3D62',
        'brand-green': '#3F8F5D',
        'brand-green-soft': '#E2EFE6',
        'brand-danger': '#C24B3A',
        'brand-danger-soft': '#F9E2DD',
        'surface-1': '#F4F1E8',
        'surface-2': '#EFEBE0',
        'surface-card': '#FFFFFF',
        'border-soft': '#E6E2D6',
        'border-strong': '#D3CDBE',
      },
      fontFamily: {
        sans: ['var(--font-pretendard)', 'Pretendard', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl2: '14px',
        '2xl2': '18px',
        '3xl2': '20px',
      },
      boxShadow: {
        'btn-yellow': '0 1px 0 rgba(0,0,0,0.04), 0 8px 18px -10px rgba(180,140,30,0.45)',
        'card-hover': '0 6px 24px -8px rgba(20,16,8,0.08), 0 1px 0 rgba(0,0,0,0.02)',
        'card-rest': '0 1px 0 rgba(0,0,0,0.02)',
        'card-hero': '0 24px 60px -24px rgba(20,16,8,0.15), 0 1px 0 rgba(0,0,0,0.02)',
      },
      keyframes: {
        bounce: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'dot-bounce': 'bounce 1.2s infinite',
        'slide-in': 'slide-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
