/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pearl: {
          50: '#fefefe',
          100: '#fdfdfd',
          200: '#fbfbfb',
          300: '#f8f8f8',
          400: '#f5f5f5',
          500: '#f0f0f0',
        },
        gradient: {
          blue: {
            start: '#1e3a8a',
            middle: '#3b82f6',
            end: '#60a5fa',
          }
        }
      },
      fontFamily: {
        play: ['Play', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
