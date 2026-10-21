/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2A4A',
        inksoft: '#4A5A7A',
        paper: '#FFFFFF',
        board: '#EEF2F8',
        line: '#D5DDEA',
        teal: { DEFAULT: '#0E7C7B', dark: '#0A5F5E', light: '#D7EFEE' },
        sun: { DEFAULT: '#FFC845', light: '#FFF1C7' },
        coral: '#E5484D',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
