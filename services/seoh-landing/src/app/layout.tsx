import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SEOh — AI-Era Search Optimization',
  description: 'Is your website ready for the AI era? Get your free GEO audit and optimize for AI-driven search.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
