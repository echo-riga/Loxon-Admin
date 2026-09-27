import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeRegistry from '@/lib/registry'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Loxon Admin',
  description: 'Secure content administration for Loxon Philippines Inc.',
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
