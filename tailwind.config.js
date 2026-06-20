/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ink-navy': '#101826',
        'chart-paper': '#F1EAD6',
        'brass': '#C98A3E',
        'signal-cyan': '#4FD8C4',
        'alert-coral': '#E2604F',
        'slate-text': '#C9D3DC',
        'ink-text': '#2B2418',
      },
      fontFamily: {
        'fraunces': ['Fraunces', 'serif'],
        'spectral': ['Spectral', 'serif'],
        'mono': ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
