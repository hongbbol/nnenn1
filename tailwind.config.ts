import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 쿨톤 스카이 블루 / 플랫 화이트 — semantic prefix to avoid clashes with Tailwind defaults
        'brand-bg': '#F6FAFD',
        'brand-text': '#0F1A24',
        'brand-sub': '#586573',
        'brand-faint': '#97A3B0',
        // primary = 스카이 블루 (기존 brand-yellow 계열 대체)
        'brand-primary': '#2E97E6',
        'brand-primary-strong': '#1F86D4',
        'brand-primary-ink': '#135B8C',
        'brand-primary-soft': '#E6F3FD',
        // 보조 라이트 블루 (칩·아이콘 배경 등)
        'brand-blue': '#E6F3FD',
        'brand-blue-ink': '#135B8C',
        'brand-blue-deep': '#0C3E63',
        'brand-green': '#2FA37A',
        'brand-green-soft': '#E4F4EE',
        'brand-danger': '#E0584A',
        'brand-danger-soft': '#FBE7E4',
        'surface-1': '#EFF5FB',
        'surface-2': '#E5EEF6',
        'surface-card': '#FFFFFF',
        'border-soft': '#E4EBF2',
        'border-strong': '#D0DAE4',
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
        'btn-primary': '0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 18px -10px rgba(30,120,210,0.55)',
        'card-hover': '0 10px 30px -14px rgba(28,90,150,0.26), 0 1px 0 rgba(20,40,70,0.02)',
        'card-rest': '0 6px 22px -14px rgba(28,90,150,0.18), 0 1px 0 rgba(20,40,70,0.02)',
        'card-hero': '0 24px 60px -24px rgba(28,90,150,0.24), 0 1px 0 rgba(20,40,70,0.02)',
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
