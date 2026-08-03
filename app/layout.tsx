import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Event Flare — Live Event Map',
  description: 'Discover what\'s happening around you. A heatmap of live events.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
