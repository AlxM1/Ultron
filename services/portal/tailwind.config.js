/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#4af3ff',
        'accent-deep': '#0088cc',
      },
      borderRadius: {
        'panel': '12px',
        'button': '8px',
        'dock': '20px',
      },
    },
  },
  plugins: [],
}
