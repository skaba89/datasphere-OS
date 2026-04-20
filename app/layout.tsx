// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'DataSphere OS — Votre OS Freelance',
  description: "L'OS tout-en-un pour freelances tech : missions, facturation, CRM, Agent IA, comptabilité.",
  keywords:    ['freelance', 'data engineer', 'facturation', 'CRM', 'IA', 'missions'],
  authors:     [{ name: 'DataSphere OS' }],
  robots:      'index, follow',
  openGraph: {
    title:       'DataSphere OS',
    description: "L'OS tout-en-un pour freelances tech",
    type:        'website',
    locale:      'fr_FR',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'black-translucent',
    title:          'DataSphere OS',
  },
}

export const viewport: Viewport = {
  themeColor:   '#07080F',
  width:        'device-width',
  initialScale: 1,
  viewportFit:  'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        {/* Inter depuis system fonts — pas de dépendance Google Fonts au build */}
        <meta httpEquiv="Content-Security-Policy"
          content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; connect-src 'self' https: wss:;" />
      </head>
      <body style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
        className="bg-ds-bg text-ds-text antialiased">
        {children}
      </body>
    </html>
  )
}
