// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title:       'DataSphere OS — Votre OS Freelance',
  description: 'L\'OS tout-en-un pour freelances tech : missions, facturation, CRM, Agent IA, comptabilité.',
  keywords:    ['freelance', 'data engineer', 'facturation', 'CRM', 'IA', 'missions'],
  authors:     [{ name: 'DataSphere OS' }],
  robots:      'index, follow',
  openGraph: {
    title:       'DataSphere OS',
    description: 'L\'OS tout-en-un pour freelances tech',
    type:        'website',
    locale:      'fr_FR',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'DataSphere OS',
  },
}

export const viewport: Viewport = {
  themeColor:       '#07080F',
  width:            'device-width',
  initialScale:     1,
  viewportFit:      'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta httpEquiv="Content-Security-Policy"
          content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; connect-src 'self' https: wss:;" />
      </head>
      <body className={`${inter.variable} font-sans bg-ds-bg text-ds-text antialiased`}>
        {children}
      </body>
    </html>
  )
}
