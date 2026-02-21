import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import { LanguageProvider } from '../components/LanguageContext'
import LanguageSelect from '../components/LanguageSelect'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'march',
  description: 'ai second brain, opinionatedly designed for makers',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white`}>
        <LanguageProvider>
          <LanguageSelect />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
