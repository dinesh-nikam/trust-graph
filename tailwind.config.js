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
        background: '#09090F',
        surface: {
          DEFAULT: '#141420',
          subtle: '#101018',
          raised: '#191926',
          hover: '#1D1D2B',
          border: '#23232F',
          'border-strong': '#35354A',
        },
        ink: {
          DEFAULT: '#EDEDF4',
          muted: '#A0A0B8',
          dim: '#62627A',
          faint: '#3C3C50',
        },
        primary: {
          DEFAULT: '#8B5CF6',
          bright: '#A78BFA',
          deep: '#7C3AED',
          dim: 'rgba(139, 92, 246, 0.12)',
        },
        evidence: {
          DEFAULT: '#22D3EE',
          deep: '#0891B2',
          dim: 'rgba(34, 211, 238, 0.10)',
        },
        status: {
          verified: '#34D399',
          pending: '#E5B567',       // amber — awaiting an action
          rejected: '#FB7185',      // rose — triaged and turned down
          revoked: '#F97316',       // orange — previously valid, invalidated for cause
          expired: '#A9B4C6',       // cool steel — time elapsed (distinct from amber pending)
          'invalid-issuer': '#7A7A8C', // dim slate — the "ghost" unauthorized state
        },
        monad: {
          purple: '#8B5CF6',
          dark: '#200052',
          subtle: '#1E1A38',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'nano': ['10px', '14px'],
      },
      letterSpacing: {
        'widest-xl': '0.22em',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        card: '0 4px 24px -6px rgba(0, 0, 0, 0.6)',
        'panel-hover': '0 8px 32px -8px rgba(0, 0, 0, 0.7)',
        'glow-primary': '0 0 24px -6px rgba(139, 92, 246, 0.35)',
        'glow-evidence': '0 0 20px -6px rgba(34, 211, 238, 0.30)',
      },
      maxWidth: {
        '8xl': '90rem',
      },
    },
  },
  plugins: [],
}
