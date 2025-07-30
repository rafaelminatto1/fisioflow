/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6', // blue-500
          light: '#60a5fa', // blue-400
          dark: '#2563eb', // blue-600
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1e293b', // slate-800
          foreground: '#f1f5f9', // slate-100
        },
        background: '#0f172a', // slate-900
        foreground: '#f1f5f9', // slate-100
        success: '#22c55e', // green-500
        danger: '#ef4444', // red-500
        warning: '#f59e0b', // amber-500
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        full: '9999px',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Garante que user-select seja incluído com prefixos
    userSelect: true,
  },
  future: {
    // Habilita funcionalidades futuras para compatibilidade
    hoverOnlyWhenSupported: true,
  },
};
