/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-color-scheme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },

        // ===== Ivory token-bound utilities (System Design §5) =====
        // Additive: new (flagged) screens use these; legacy `primary` stays
        // until cutover. Every value resolves to a CSS var from tokens.css so
        // theme/accent/board/density tweaks recolor live with no rebuild.
        bg: 'var(--bg)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          elev: 'var(--surface-elev)',
        },
        hairline: 'var(--hairline)',
        'border-iv': 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: {
          hi: 'var(--text-hi)',
          body: 'var(--text-body)',
          mid: 'var(--text-mid)',
          low: 'var(--text-low)',
          faint: 'var(--text-faint)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          bright: 'var(--accent-bright)',
          on: 'var(--on-accent)',
        },
        mq: {
          brilliant: 'var(--mq-brilliant)',
          best: 'var(--mq-best)',
          good: 'var(--mq-good)',
          inaccuracy: 'var(--mq-inaccuracy)',
          mistake: 'var(--mq-mistake)',
          blunder: 'var(--mq-blunder)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',
        board: {
          light: 'var(--board-light)',
          dark: 'var(--board-dark)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        // Ivory families (§5.3)
        onest: ['Onest', 'system-ui', '-apple-system', 'sans-serif'],
        jbmono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'iv-xs': 'var(--r-xs)',
        'iv-sm': 'var(--r-sm)',
        'iv-md': 'var(--r-md)',
        'iv-lg': 'var(--r-lg)',
        'iv-xl': 'var(--r-xl)',
        'iv-pill': 'var(--r-pill)',
      },
      boxShadow: {
        'iv-card': 'var(--shadow-card)',
        'iv-hero': 'var(--shadow-hero)',
        'iv-pop': 'var(--shadow-pop)',
        'iv-accent': 'var(--shadow-accent)',
        'iv-board': 'var(--board-shadow)',
      },
      backgroundImage: {
        'iv-grad': 'var(--bg-grad)',
        'iv-card-grad': 'var(--surface-card-grad)',
        'iv-accent-grad': 'var(--accent-grad)',
      },
      transitionTimingFunction: {
        'iv-standard': 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        'iv-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      maxWidth: {
        content: 'var(--content-max)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
