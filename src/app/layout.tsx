import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeRegistry from '@/lib/registry'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Loxon Philippines Inc. | Engineering & Construction Excellence',
  description: 'Premier engineering and construction company in the Philippines since 1998.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-white text-gray-900">
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  )
}