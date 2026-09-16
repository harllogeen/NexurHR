/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand primary — a refined navy-indigo
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Sidebar surface
        sidebar: {
          bg:     '#0f172a',
          hover:  '#1e293b',
          active: '#1e293b',
          border: '#1e293b',
          text:   '#94a3b8',
          muted:  '#475569',
        },
        // Surface tokens
        surface: {
          0:   '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'card':     '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-md':  '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'card-lg':  '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.04)',
        'card-xl':  '0 20px 25px -5px rgba(0,0,0,0.07), 0 8px 10px -6px rgba(0,0,0,0.04)',
        'brand':    '0 4px 14px 0 rgba(79,70,229,0.25)',
        'brand-lg': '0 8px 25px 0 rgba(79,70,229,0.30)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out both',
        'slide-up':   'slideUp 0.35s ease-out both',
        'slide-down': 'slideDown 0.25s ease-out both',
        'scale-in':   'scaleIn 0.2s ease-out both',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      backgroundImage: {
        'gradient-brand':  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'gradient-hero':   'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      },
    },
  },
  plugins: [],
}
