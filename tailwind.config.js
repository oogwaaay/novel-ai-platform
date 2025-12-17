/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        dark: {
          primary: '#f1f5f9',
          secondary: '#cbd5e1',
          bg: {
            page: '#0f172a',
            card: '#1e293b',
            input: '#1e293b',
          },
          border: '#334155',
          accent: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
}

