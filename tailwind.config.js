/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#E8EDF3',
          100: '#C5D1E0',
          200: '#8FA8C4',
          300: '#5A7FA8',
          400: '#2E5680',
          500: '#0B1F3A',
          600: '#0A1B33',
          700: '#08172B',
          800: '#061323',
          900: '#040F1B',
        },
        teal: {
          50: '#E6F7F5',
          100: '#C3EEE9',
          200: '#99E0D7',
          300: '#5FCABE',
          400: '#33B8A9',
          500: '#14B8A6',
          600: '#0E9488',
          700: '#0A766D',
          800: '#07584F',
          900: '#053A33',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
