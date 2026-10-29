/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { bg: '#0B0D12', surface: '#12151C', 'surface-2': '#1A1E28', border: '#262B38', text: '#E8EAF0', muted: '#8A91A5', accent: '#F5B84B', 'accent-hover': '#FFCB6B', danger: '#EF5B5B', success: '#3DD68C', info: '#5AA9FF' }, fontFamily: { heading: ['Space Grotesk', 'sans-serif'], sans: ['Inter', 'sans-serif'], mono: ['DM Mono', 'monospace'] }, boxShadow: { glow: '0 0 60px rgb(245 184 75 / 8%)' } } },
  plugins: []
};
