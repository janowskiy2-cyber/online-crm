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
        crm: {
          dark: '#1e222d',
          sidebar: '#181b23',
          card: '#272b38',
          border: '#32384a',
          accent: '#3b82f6',
          amoGreen: '#22c55e',
          amoYellow: '#f59e0b',
          amoRed: '#ef4444',
          amoPurple: '#8b5cf6',
          amoBlue: '#3b82f6'
        }
      }
    },
  },
  plugins: [],
}
