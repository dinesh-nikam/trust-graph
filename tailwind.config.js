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
        background: '#0a0a0c',
        surface: {
          DEFAULT: '#111114',
          subtle: '#16161a',
          hover: '#1d1d22',
          border: '#232329',
          'border-strong': '#32323b',
        },
        monad: {
          purple: '#836EF9',
          dark: '#200052',
          subtle: '#1e1a38',
        },
        status: {
          verified: '#10b981',
          pending: '#f59e0b',
          rejected: '#ef4444',
          revoked: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
