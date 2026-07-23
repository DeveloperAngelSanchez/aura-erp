/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          blue: {
            50: '#EFF6FF',
            600: '#2563EB',
            700: '#1D4ED8',
          },
          dark: {
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
            950: '#030712',
          }
        }
      }
    },
  },
  plugins: [],
}
