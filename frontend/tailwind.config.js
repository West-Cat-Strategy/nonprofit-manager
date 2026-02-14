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
          'surface-muted': 'var(--app-surface-muted)',
          'surface-elevated': 'var(--app-surface-elevated)',
          text: 'var(--app-text)',
          'text-muted': 'var(--app-text-muted)',
          'text-subtle': 'var(--app-text-subtle)',
          'text-heading': 'var(--app-text-heading)',
          'text-label': 'var(--app-text-label)',
          border: 'var(--app-border)',
          'border-muted': 'var(--app-border-muted)',
          accent: 'var(--app-accent)',
          'accent-hover': 'var(--app-accent-hover)',
          'accent-text': 'var(--app-accent-text)',
          'accent-text-hover': 'var(--app-accent-text-hover)',
          'accent-soft': 'var(--app-accent-soft)',
          'accent-soft-hover': 'var(--app-accent-soft-hover)',
          hover: 'var(--app-hover)',
          'input-bg': 'var(--app-input-bg)',
          'input-border': 'var(--app-input-border)',
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
