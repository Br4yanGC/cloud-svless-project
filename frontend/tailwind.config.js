/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'utec-blue': '#003366',
        'utec-orange': '#FF6B35',
      }
    },
  },
  plugins: [],
}
