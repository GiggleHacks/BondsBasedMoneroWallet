import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#181818',
          surface: '#1a1a1a',
          hover: '#222222',
        },
        accent: {
          primary: '#f26822',
          secondary: '#d95b1c',
          tertiary: '#c04e18',
          hover: '#ff7a33',
          glow: 'rgba(242, 104, 34, 0.35)',
        },
        text: {
          primary: '#e0e0e0',
          secondary: '#a0a0a0',
          muted: '#666666',
        },
        status: {
          success: '#4ade80',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#60a5fa',
        },
        border: {
          DEFAULT: '#2a2a2a',
          hover: '#3a3a3a',
          accent: '#f26822',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
        mono: ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
        display: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        '4xl': ['2.75rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        full: '9999px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(242, 104, 34, 0.2)',
        'glow-lg': '0 0 40px rgba(242, 104, 34, 0.35)',
        card: '0 1px 3px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(242, 104, 34, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(135deg, #151515, #111111)',
        'gradient-accent': 'linear-gradient(135deg, #f26822, #d95b1c)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'cursor-blink': 'cursorBlink 1s step-end infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(242, 104, 34, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(242, 104, 34, 0.35)' },
        },
        cursorBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
