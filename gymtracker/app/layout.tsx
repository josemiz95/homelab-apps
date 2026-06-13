import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import NavBar from '@/components/layout/NavBar'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GymTracker',
  description: 'Registro de progreso en el gimnasio',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} min-h-screen bg-[#0f0f0f] text-[#f5f5f5] antialiased`}>
        <NavBar />
        <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
