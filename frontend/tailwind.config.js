/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#163A5F',
          dark: '#0F2F4D',
          light: '#1F4E79'
        },
        clinical: {
          teal: '#0E7490',
          cyan: '#06B6D4',
          purple: '#6D5CE7',
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          text: '#0F172A',
          secondary: '#64748B',
          border: '#E2E8F0',
          success: '#15803D',
          warning: '#B45309',
          danger: '#B91C1C',
          criticalBg: '#FEF2F2',
          infoBg: '#EFF6FF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'clinical': '12px',
        'clinical-lg': '16px'
      }
    },
  },
  plugins: [],
}
