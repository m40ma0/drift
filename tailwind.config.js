/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ink-navy':    'rgb(var(--c-ink-navy) / <alpha-value>)',
        'chart-paper': 'rgb(var(--c-chart-paper) / <alpha-value>)',
        'brass':       'rgb(var(--c-brass) / <alpha-value>)',
        'signal-cyan': 'rgb(var(--c-signal-cyan) / <alpha-value>)',
        'alert-coral': 'rgb(var(--c-alert-coral) / <alpha-value>)',
        'slate-text':  'rgb(var(--c-slate-text) / <alpha-value>)',
        'ink-text':    'rgb(var(--c-ink-text) / <alpha-value>)',
        'warm-bg':     'rgb(var(--c-warm-bg) / <alpha-value>)',
        'card-border': 'rgb(var(--c-card-border) / <alpha-value>)',
      },
      fontFamily: {
        'sans': ['Poppins', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out forwards',
      },
    },
  },
  plugins: [],
}
