// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WorldMood — Global Sentiment Map',
  description: 'See how the world feels about every country in real time. Vote, explore trends, and discover global sentiment.',
  keywords: ['world map', 'sentiment', 'global mood', 'countries', 'live voting', 'geopolitics'],
  openGraph: {
    title: 'WorldMood — Global Sentiment Map',
    description: 'Live global sentiment map. Vote on countries, track trends, see the world\'s mood.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorldMood — Global Sentiment Map',
    description: 'Live global sentiment map. Vote on countries, track trends.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
