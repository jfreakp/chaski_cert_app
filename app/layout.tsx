import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { PROJECT_NAME } from '@/app/lib/config'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: PROJECT_NAME,
  description: 'El estándar soberano para certificación académica en blockchain',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="min-h-screen font-manrope antialiased">{children}</body>
    </html>
  )
}
