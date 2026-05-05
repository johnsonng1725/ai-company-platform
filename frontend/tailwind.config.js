/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#09090b',   // zinc-950 — pure carbon, no purple tint
          card:    '#111113',   // zinc-900
          hover:   '#1c1c1f',   // zinc-800
          border:  'rgba(255,255,255,0.08)',
          sidebar: '#0d0d10',   // slightly different for sidebar panel
        },
        accent: {
          DEFAULT: '#0d9488',   // teal-600 — growth, business, distinct
          light:   '#14b8a6',   // teal-500
          subtle:  '#0f766e',   // teal-700
          glow:    'rgba(13,148,136,0.18)',
        },
        ink: {
          DEFAULT: '#fafafa',   // near-white headings
          muted:   '#a1a1aa',   // zinc-400 body text
          faint:   '#52525b',   // zinc-600 placeholders/hints
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'shimmer':    'shimmer 2s infinite linear',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                           to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' },          to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
