import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Latenite.ai - AI-Powered Terminal Intelligence',
  description: 'The next generation AI terminal that understands your code, automates tasks, and enhances productivity across all platforms and SSH-supported servers.',
}

// Force dynamic rendering for all routes
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
} 