/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette: cream f4f1de, terracotta e07a5f, blue-grey 3d405b, sage 81b29a, sand f2cc8f
        ink: '#3D405B',
        inksoft: '#5F627A',
        paper: '#FFFFFF',
        board: '#F4F1DE',
        line: '#E6E1CB',
        // Main buttons and links use the blue-grey; red is kept for warnings and errors only
        brand: { DEFAULT: '#3D405B', dark: '#2B2D42', light: '#F4F1DE', soft: '#E07A5F' },
        sage: { DEFAULT: '#81B29A', dark: '#46725D', light: '#DDEBE3' },
        sun: { DEFAULT: '#F2CC8F', light: '#FAEBCB' },
        coral: '#B42318',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
