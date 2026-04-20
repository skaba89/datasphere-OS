'use client'
// app/dashboard/layout.tsx
// Layout principal de l'app : Sidebar gauche + Header + Contenu
import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import type { Plan } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [plan, setPlan] = useState<Plan>('free')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Charger les infos utilisateur depuis localStorage (v21 compat)
    try {
      const raw = localStorage.getItem('datasphere_os_v1')
      if (raw) {
        const state = JSON.parse(raw)
        setPlan(state.plan || 'free')
        setUserName(state.cv?.nom || state.authUser?.email?.split('@')[0] || '')
      }
    } catch {}

    // Collapse sidebar sur mobile
    if (window.innerWidth < 768) setCollapsed(true)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-ds-bg">
      {/* Sidebar */}
      <Sidebar
        plan={plan}
        userName={userName}
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />

      {/* Zone principale */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header */}
        <Header collapsed={collapsed} />

        {/* Contenu */}
        <main
          id="main-content"
          role="main"
          aria-label="Contenu principal"
          className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-7"
        >
          <div className="max-w-[1400px] mx-auto animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}

function MobileNav() {
  const tabs = [
    { id: 'dashboard',   icon: '📊', label: 'Home' },
    { id: 'missions',    icon: '🚀', label: 'Missions' },
    { id: 'facturation', icon: '💶', label: 'Factures' },
    { id: 'agent',       icon: '🤖', label: 'Agent IA' },
    { id: 'commercial',  icon: '💼', label: 'CRM' },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50
        bg-ds-bg1/97 backdrop-blur-xl border-t border-ds-border
        flex pb-safe"
      aria-label="Navigation mobile"
    >
      {tabs.map(t => (
        <a
          key={t.id}
          href={`/${t.id}`}
          className="nav-tab-mobile"
          aria-label={t.label}
        >
          <span className="text-lg">{t.icon}</span>
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  )
}
