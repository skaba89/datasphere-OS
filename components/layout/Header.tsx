'use client'
import { useState, useEffect } from 'react'
import { Search, Bell, Settings, Zap, Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types'

interface HeaderProps { collapsed?: boolean }

const PLAN_STYLES: Record<Plan, { label: string; className: string }> = {
  free:       { label: 'Free',          className: 'bg-ds-bg3 text-ds-text3 border-ds-border' },
  pro:        { label: 'Pro ⚡',        className: 'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20' },
  agency:     { label: 'Agency ✦',     className: 'bg-ds-violet/10 text-ds-violet2 border-ds-violet/20' },
  earlybird:  { label: 'Early Bird ⭐', className: 'bg-ds-amber/10 text-ds-amber border-ds-amber/20' },
  superadmin: { label: 'Admin 👑',     className: 'bg-ds-rose/10 text-ds-rose border-ds-rose/20' },
}

export function Header({ collapsed }: HeaderProps) {
  const [plan,        setPlan]   = useState<Plan>('free')
  const [online,      setOnline] = useState(true)
  const [notifCount,  setNotif]  = useState(0)
  const [searchOpen,  setSearch] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('datasphere_os_v1')
      if (raw) {
        const s = JSON.parse(raw)
        setPlan(s.plan || 'free')
        const overdue = (s.factures || []).filter((f: { statut: string; date: string }) =>
          f.statut !== 'Payée' &&
          (Date.now() - new Date(f.date).getTime()) / 86400000 > 30
        ).length
        const rappels = (s.rappels || []).filter((r: { done: boolean; date: string }) =>
          !r.done && r.date <= new Date().toISOString().slice(0, 10)
        ).length
        setNotif(overdue + rappels)
      }
    } catch {}
    setOnline(navigator.onLine)
    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearch(v => !v) }
      if (e.key === 'Escape') setSearch(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const planStyle = PLAN_STYLES[plan]

  return (
    <>
      <header className="h-13 flex items-center justify-between px-5
        bg-ds-bg1/95 backdrop-blur-xl border-b border-ds-border
        sticky top-0 z-40 flex-shrink-0" role="banner">
        <div className="flex items-center gap-3">
          {collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-ds-blue to-ds-violet
                flex items-center justify-center text-white text-xs font-bold">◈</div>
              <span className="font-extrabold text-sm tracking-tight text-ds-text hidden sm:block">
                Data<span className="bg-gradient-to-r from-ds-blue2 to-ds-violet bg-clip-text text-transparent">Sphere</span>
              </span>
            </div>
          )}
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', planStyle.className)}>
            {planStyle.label}
          </span>
          <div className={cn('w-1.5 h-1.5 rounded-full', online ? 'bg-ds-green' : 'bg-ds-amber')}
            title={online ? 'En ligne' : 'Hors-ligne'} />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setSearch(true)}
            className="flex items-center gap-2 h-8 px-3 rounded-ds-sm
              bg-ds-bg3 border border-ds-border text-ds-text3
              hover:text-ds-text2 hover:border-ds-border2 transition-all text-xs"
            aria-label="Recherche globale">
            <Search size={13} />
            <span className="hidden md:block">Rechercher</span>
            <kbd className="hidden md:flex items-center gap-0.5 ml-1
              text-[9px] px-1 py-0.5 bg-ds-bg4 border border-ds-border rounded text-ds-text3 font-mono">
              <Command size={8} />K
            </kbd>
          </button>
          <button className="relative h-8 w-8 flex items-center justify-center
            rounded-ds-sm bg-ds-bg3 border border-ds-border text-ds-text3
            hover:text-ds-text2 transition-all"
            aria-label={`${notifCount} notifications`}>
            <Bell size={14} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full
                bg-ds-rose text-white text-[8px] font-bold flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          <button className="h-8 w-8 flex items-center justify-center
            rounded-ds-sm bg-ds-bg3 border border-ds-border text-ds-text3
            hover:text-ds-text2 transition-all" aria-label="Configuration IA">
            <Zap size={14} />
          </button>
          <a href="/settings" className="h-8 w-8 flex items-center justify-center
            rounded-ds-sm bg-ds-bg3 border border-ds-border text-ds-text3
            hover:text-ds-text2 transition-all" aria-label="Paramètres">
            <Settings size={14} />
          </a>
        </div>
      </header>
      {searchOpen && (
        <div className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[200]
          flex items-start justify-center pt-20 px-4"
          onClick={() => setSearch(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-xl bg-ds-bg2 border border-ds-border2
            rounded-[20px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,.7)]"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ds-border">
              <Search size={16} className="text-ds-text3" />
              <input autoFocus placeholder="Rechercher…"
                className="flex-1 bg-transparent text-ds-text text-sm outline-none placeholder:text-ds-text3"
                onKeyDown={e => e.key === 'Escape' && setSearch(false)} />
              <kbd className="text-[10px] px-2 py-1 bg-ds-bg3 border border-ds-border rounded text-ds-text3">Échap</kbd>
            </div>
            <div className="py-2">
              {[
                { href:'/dashboard',   icon:'📊', label:'Dashboard',    sub:'Vue d\'ensemble' },
                { href:'/missions',    icon:'🚀', label:'Missions',     sub:'Gérer vos missions' },
                { href:'/facturation', icon:'💶', label:'Facturation',  sub:'Créer une facture' },
                { href:'/offres',      icon:'🔍', label:'Offres live',  sub:'Missions en temps réel' },
                { href:'/agent',       icon:'🤖', label:'Agent IA',     sub:'Automatiser les candidatures' },
                { href:'/pricing',     icon:'💎', label:'Plans & Tarifs', sub:'Passer au Pro' },
              ].map(r => (
                <a key={r.href} href={r.href}
                  onClick={() => setSearch(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-ds-bg3 transition-colors no-underline">
                  <span className="text-base w-5 text-center">{r.icon}</span>
                  <div>
                    <div className="text-sm text-ds-text font-medium">{r.label}</div>
                    <div className="text-[11px] text-ds-text3">{r.sub}</div>
                  </div>
                </a>
              ))}
            </div>
            <div className="flex gap-4 px-4 py-2.5 border-t border-ds-border text-[10px] text-ds-text3">
              <span>↵ Ouvrir</span><span>Échap Fermer</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
