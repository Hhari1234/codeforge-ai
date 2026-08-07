/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Brand & accent palette (slate / indigo / blue / emerald / purple)
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        surface: {
          950: '#020617',
          900: '#0f172a',
          850: '#111c33',
          800: '#1e293b',
          700: '#334155',
        },
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(99, 102, 241, 0.45)',
        'glow-emerald': '0 0 40px -8px rgba(16, 185, 129, 0.45)',
        'glow-purple': '0 0 40px -8px rgba(168, 85, 247, 0.45)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
        soft: '0 4px 24px rgba(0, 0, 0, 0.25)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-hero': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #0ea5e9 100%)',
        'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'gradient-border': 'linear-gradient(135deg, rgba(99,102,241,0.6), rgba(139,92,246,0.6), rgba(16,185,129,0.6))',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
