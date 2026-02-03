/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        loop: {
          yellow: '#FFD700',
          green: '#90EE90',
          purple: '#D8BFD8',
          pink: '#FFB6C1',
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
    },
  },
  plugins: [],
}
