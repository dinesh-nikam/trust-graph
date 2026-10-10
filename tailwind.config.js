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
        background: '#010806',
        // Green-tinted neutral ramp so every existing neutral-* utility adopts the new surface system.
        neutral: {
          50: '#F3FAFC',
          100: '#E4EEF0',
          200: '#C9D6D9',
          300: '#A9B6BA',
          400: '#9CA9AD',
          500: '#7C878B',
          600: '#4E5A5C',
          700: '#26332F',
          800: '#17231F',
          850: '#121D19',
          900: '#0A1411',
          950: '#040C0A',
        },
        emerald: {
          50: '#E9FDF8',
          100: '#C8FAEE',
          200: '#93F4DC',
          300: '#5FEECE',
          400: '#29E9BF',
          500: '#1DCBA4',
          600: '#11976B',
          700: '#0E7756',
          800: '#0D5A42',
          900: '#0B4232',
          950: '#04261D',
        },
        indigo: {
          50: '#EDF8FB',
          100: '#D2EEF5',
          200: '#A9DEEB',
          300: '#86CFE1',
          400: '#67BCD3',
          500: '#3F9DB8',
          600: '#2F7F96',
          700: '#266577',
          800: '#1D4C5A',
          900: '#163944',
          950: '#0A1F26',
        },
        rose: {
          50: '#FCEEEF',
          100: '#F8D9DA',
          200: '#F1BCBE',
          300: '#E99A9D',
          400: '#E07479',
          500: '#CF5359',
          600: '#B23F45',
          700: '#8E3237',
          800: '#64262A',
          900: '#43191C',
          950: '#260E10',
        },
        surface: {
          DEFAULT: '#07110E',
          subtle: '#0A1411',
          hover: '#0F1B17',
          border: '#17231F',
          'border-strong': '#26332F',
        },
        accent: {
          DEFAULT: '#29E9BF',
          deep: '#11976B',
          forest: '#245A4D',
        },
        ink: {
          DEFAULT: '#F3FAFC',
          muted: '#9CA9AD',
          faint: '#747E82',
        },
        status: {
          verified: '#29E9BF',
          pending: '#F59E0B',
          rejected: '#E07479',
          revoked: '#F97316',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        card: '0 20px 50px -20px rgba(0, 0, 0, 0.7)',
        glow: '0 0 0 1px rgba(41, 233, 191, 0.35), 0 8px 30px -6px rgba(41, 233, 191, 0.45)',
        float: '0 40px 80px -30px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'drawer-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        dash: {
          to: { strokeDashoffset: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 7s ease-in-out infinite',
        'drawer-in': 'drawer-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        dash: 'dash 2.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
    },
  },
  plugins: [],
}
