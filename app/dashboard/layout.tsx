'use client'
import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import type { Plan } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [plan,      setPlan]      = useState<Plan>('free')
  const [userName,  setUserName]  = useState('')
  const [overdueCount, setOverdue] = useState(0)
  const [rappelCount,  setRappels] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('datasphere_os_v1')
      if (raw) {
        const s = JSON.parse(raw)
        setPlan(s.plan || 'free')
        setUserName(s.cv?.nom || s.authUser?.email?.split('@')[0] || '')
        const today = new Date().toISOString().slice(0, 10)
        setOverdue((s.factures || []).filter((f: { statut: string; date: string }) =>
          f.statut !== 'Payée' && ((Date.now() - new Date(f.date).getTime()) / 86400000) > 30
        ).length)
        setRappels((s.rappels || []).filter((r: { done: boolean; date: string }) =>
          !r.done && r.date <= today
        ).length)
      }
    } catch {}
    if (window.innerWidth < 768) setCollapsed(true)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-ds-bg">
      <Sidebar
        plan={plan}
        userName={userName}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        overdueCount={overdueCount}
        rappelCount={rappelCount}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header collapsed={collapsed} />
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-7"
        >
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50
        bg-ds-bg1/97 backdrop-blur-xl border-t border-ds-border flex"
        aria-label="Navigation mobile"
      >
        {[
          { id:'dashboard',   icon:'📊', label:'Home' },
          { id:'missions',    icon:'🚀', label:'Missions' },
          { id:'facturation', icon:'💶', label:'Factures' },
          { id:'agent',       icon:'🤖', label:'Agent IA' },
          { id:'offres',      icon:'🔍', label:'Offres' },
        ].map(t => (
          <a key={t.id} href={`/${t.id}`}
            className="flex flex-col items-center gap-1 px-2 py-2 flex-1
              text-[9px] font-medium text-ds-text3 no-underline"
          >
            <span className="text-lg">{t.icon}</span>
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
