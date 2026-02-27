import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: { 500: '#f5a623' },
        dark: '#0a0a0a',
      },
    },
  },
  plugins: [],
}
export default config
