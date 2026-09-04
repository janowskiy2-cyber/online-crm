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
          dark: '#080c14',
          sidebar: '#0e1422',
          card: '#121828',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#3b82f6',
          amoGreen: '#10b981',
          amoYellow: '#f59e0b',
          amoRed: '#ef4444',
          amoPurple: '#8b5cf6',
          amoBlue: '#3b82f6'
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.06)',
        'glow-blue': '0 0 20px -5px rgba(59, 130, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
