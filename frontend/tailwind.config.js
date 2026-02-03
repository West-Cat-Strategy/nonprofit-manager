/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '.neo-dark-mode'],
  theme: {
    extend: {
      colors: {
        loop: {
          yellow: 'var(--loop-yellow)',
          green: 'var(--loop-green)',
          purple: 'var(--loop-purple)',
          pink: 'var(--loop-pink)',
          cyan: 'var(--loop-cyan)',
          blue: 'var(--loop-blue)',
        },
        app: {
          bg: 'var(--app-bg)',
          surface: 'var(--app-surface)',
          text: 'var(--app-text)',
          border: 'var(--app-border)',
        },
      },
      boxShadow: {
        'brutal': '4px 4px 0px var(--shadow-color)',
        'brutal-sm': '2px 2px 0px var(--shadow-color)',
        'brutal-lg': '6px 6px 0px var(--shadow-color)',
      },
      fontWeight: {
        'brutal': '800',
      },
      borderWidth: {
        'brutal': '2px',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-50px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        popIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        slideDown: 'slideDown 0.6s ease-out forwards',
        popIn: 'popIn 0.5s ease-out forwards 0.5s',
      },
    },
  },
  plugins: [],
}
