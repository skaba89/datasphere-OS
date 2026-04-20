'use client'
// components/layout/Header.tsx
import { useState, useEffect } from 'react'
import { Search, Bell, Settings, Zap, Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types'

interface HeaderProps {
  collapsed?: boolean
}

const PLAN_STYLES: Record<Plan, { label: string; className: string }> = {
  free:       { label: 'Free',        className: 'bg-ds-bg3 text-ds-text3 border-ds-border' },
  pro:        { label: 'Pro ⚡',      className: 'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20' },
  agency:     { label: 'Agency ✦',   className: 'bg-ds-violet/10 text-ds-violet2 border-ds-violet/20' },
  earlybird:  { label: 'Early Bird ⭐', className: 'bg-ds-amber/10 text-ds-amber border-ds-amber/20' },
  superadmin: { label: 'Admin 👑',   className: 'bg-ds-rose/10 text-ds-rose border-ds-rose/20' },
}

export function Header({ collapsed }: HeaderProps) {
  const [plan, setPlan]         = useState<Plan>('free')
  const [online, setOnline]     = useState(true)
  const [notifCount, setNotif]  = useState(0)
  const [searchOpen, setSearch] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('datasphere_os_v1')
      if (raw) {
        const s = JSON.parse(raw)
        setPlan(s.plan || 'free')
        // Compter les notifications importantes
        const overdue = (s.factures||[]).filter((f: {statut:string;date:string}) =>
          f.statut !== 'Payée' &&
          (Date.now() - new Date(f.date).getTime()) / 86400000 > 30
        ).length
        const rappels = (s.rappels||[]).filter((r: {done:boolean;date:string}) =>
          !r.done && r.date <= new Date().toISOString().slice(0,10)
        ).length
        setNotif(overdue + rappels)
      }
    } catch {}

    setOnline(navigator.onLine)
    window.addEventListener('online',  () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))

    // Cmd+K / Ctrl+K pour ouvrir la recherche
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearch(v => !v)
      }
      if (e.key === 'Escape') setSearch(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const planStyle = PLAN_STYLES[plan]

  return (
    <>
      <header
        className="h-13 flex items-center justify-between px-5
          bg-ds-bg1/95 backdrop-blur-xl border-b border-ds-border
          sticky top-0 z-40 flex-shrink-0"
        role="banner"
      >
        {/* Left — Logo (visible si sidebar collapsed) */}
        <div className="flex items-center gap-3">
          {collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-ds-blue to-ds-violet
                flex items-center justify-center text-white text-xs font-bold
                shadow-[0_4px_12px_rgba(91,127,255,.35)]">
                ◈
              </div>
              <span className="font-extrabold text-sm tracking-tight text-ds-text hidden sm:block">
                Data<span className="text-gradient">Sphere</span>
              </span>
            </div>
          )}

          {/* Plan badge */}
          <span className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
            planStyle.className
          )}>
            {planStyle.label}
          </span>

          {/* Online indicator */}
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              online ? 'bg-ds-green shadow-[0_0_6px_rgba(0,201,141,.6)]' : 'bg-ds-amber'
            )} title={online ? 'En ligne' : 'Hors-ligne'} />
            {!online && (
              <span className="text-[10px] text-ds-amber hidden sm:block">Hors-ligne</span>
            )}
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Actions header">

          {/* Recherche globale */}
          <button
            onClick={() => setSearch(true)}
            className="flex items-center gap-2 h-8 px-3 rounded-ds-sm
              bg-ds-bg3 border border-ds-border text-ds-text3
              hover:text-ds-text2 hover:border-ds-border2 transition-all text-xs"
            aria-label="Recherche globale (Cmd+K)"
          >
            <Search size={13} />
            <span className="hidden md:block">Rechercher</span>
            <kbd className="hidden md:flex items-center gap-0.5 ml-1
              text-[9px] px-1 py-0.5 bg-ds-bg4 border border-ds-border
              rounded text-ds-text3 font-mono">
              <Command size={8} />K
            </kbd>
          </button>

          {/* Notifications */}
          <button
            className="relative h-8 w-8 flex items-center justify-center
              rounded-ds-sm bg-ds-bg3 border border-ds-border text-ds-text3
              hover:text-ds-text2 hover:border-ds-border2 transition-all"
            aria-label={`${notifCount} notification${notifCount > 1 ? 's' : ''}`}
            onClick={() => {
              // Ouvrir le centre de notifications (fonction v21)
              if (typeof window !== 'undefined' && (window as unknown as {openNotifCenter?:()=>void}).openNotifCenter) {
                (window as unknown as {openNotifCenter:()=>void}).openNotifCenter()
              }
            }}
          >
            <Bell size={14} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full
                bg-ds-rose text-white text-[8px] font-bold
                flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Config IA */}
          <button
            className="h-8 w-8 flex items-center justify-center
              rounded-ds-sm bg-ds-bg3 border border-ds-border text-ds-text3
              hover:text-ds-text2 hover:border-ds-border2 transition-all"
            aria-label="Configuration IA"
            onClick={() => {
              if (typeof window !== 'undefined' && (window as unknown as {openAISettings?:()=>void}).openAISettings) {
                (window as unknown as {openAISettings:()=>void}).openAISettings()
              }
            }}
          >
            <Zap size={14} />
          </button>

          {/* Paramètres */}
          <a
            href="/settings"
            className="h-8 w-8 flex items-center justify-center
              rounded-ds-sm bg-ds-bg3 border border-ds-border text-ds-text3
              hover:text-ds-text2 hover:border-ds-border2 transition-all"
            aria-label="Paramètres"
          >
            <Settings size={14} />
          </a>
        </div>
      </header>

      {/* Global Search Modal */}
      {searchOpen && <GlobalSearch onClose={() => setSearch(false)} />}
    </>
  )
}

// ── Recherche globale Cmd+K ─────────────────────────────────
function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)

  interface SearchResult {
    icon: string
    label: string
    sub: string
    href: string
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults(DEFAULT_ACTIONS)
      return
    }
    const q = query.toLowerCase()
    const found: SearchResult[] = []

    // Chercher dans localStorage
    try {
      const raw = localStorage.getItem('datasphere_os_v1')
      if (raw) {
        const s = JSON.parse(raw)
        ;(s.missions||[]).filter((m: {titre:string;client:string}) =>
          (m.titre+m.client).toLowerCase().includes(q)
        ).forEach((m: {titre:string;client:string;statut:string}) => {
          found.push({ icon:'🚀', label: m.titre||m.client, sub: 'Mission · '+m.statut, href:'/missions' })
        })
        ;(s.factures||[]).filter((f: {client:string;numero:string;objet:string}) =>
          (f.client+f.numero+f.objet).toLowerCase().includes(q)
        ).forEach((f: {numero:string;client:string;statut:string;montant:number}) => {
          found.push({ icon:'💶', label: f.numero||f.client, sub: 'Facture · '+f.statut+' · '+f.montant+'€', href:'/facturation' })
        })
      }
    } catch {}

    // Onglets
    NAV_ITEMS.filter(n => n.label.toLowerCase().includes(q))
      .forEach(n => found.push({ icon: n.icon, label: n.label, sub: 'Onglet', href: n.href }))

    setResults(found.slice(0, 8))
    setSelected(0)
  }, [query])

  const NAV_ITEMS = [
    { icon:'📊', label:'Dashboard',   href:'/dashboard' },
    { icon:'🚀', label:'Missions',    href:'/missions' },
    { icon:'💶', label:'Facturation', href:'/facturation' },
    { icon:'🤖', label:'Agent IA',    href:'/agent' },
    { icon:'💼', label:'CRM',         href:'/commercial' },
    { icon:'📊', label:'Comptabilité',href:'/comptabilite' },
    { icon:'💎', label:'Tarifs',      href:'/pricing' },
  ]

  const DEFAULT_ACTIONS: SearchResult[] = [
    { icon:'📊', label:'Dashboard',         sub:'Vue d\'ensemble',    href:'/dashboard' },
    { icon:'🚀', label:'Missions',          sub:'Gérer vos missions', href:'/missions' },
    { icon:'💶', label:'Facturation',       sub:'Créer une facture',  href:'/facturation' },
    { icon:'🤖', label:'Agent IA',          sub:'Lancer une recherche',href:'/agent' },
    { icon:'🔍', label:'Offres live',       sub:'Missions en temps réel',href:'/offres' },
    { icon:'💎', label:'Plans & Tarifs',    sub:'Passer au Pro',      href:'/pricing' },
  ]

  function navigate(href: string) {
    window.location.href = href
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[200]
        flex items-start justify-center pt-20 px-4 animate-fade-up"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Recherche globale"
    >
      <div className="w-full max-w-xl bg-ds-bg2 border border-ds-border2
        rounded-ds-xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,.7)]
        animate-slide-up">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ds-border">
          <Search size={16} className="text-ds-text3 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, results.length-1)) }
              if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)) }
              if (e.key === 'Enter' && results[selected]) navigate(results[selected].href)
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Rechercher missions, factures, contacts…"
            className="flex-1 bg-transparent text-ds-text text-sm
              outline-none placeholder:text-ds-text3"
          />
          <kbd className="text-[10px] px-2 py-1 bg-ds-bg3 border border-ds-border
            rounded text-ds-text3 font-mono">
            Échap
          </kbd>
        </div>

        {/* Résultats */}
        <div className="py-1.5 max-h-80 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => navigate(r.href)}
              onMouseEnter={() => setSelected(i)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                selected === i ? 'bg-ds-bg3' : 'hover:bg-ds-bg3'
              )}
            >
              <span className="text-base w-5 text-center flex-shrink-0">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ds-text font-medium truncate">{r.label}</div>
                <div className="text-[11px] text-ds-text3 truncate">{r.sub}</div>
              </div>
              {selected === i && (
                <kbd className="text-[9px] px-1.5 py-0.5 bg-ds-bg4 border border-ds-border
                  rounded text-ds-text3 font-mono flex-shrink-0">
                  ↵
                </kbd>
              )}
            </button>
          ))}
          {results.length === 0 && (
            <div className="text-center py-8 text-ds-text3 text-sm">
              Aucun résultat pour « {query} »
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 px-4 py-2.5 border-t border-ds-border
          text-[10px] text-ds-text3">
          <span>↑↓ Naviguer</span>
          <span>↵ Ouvrir</span>
          <span>Échap Fermer</span>
        </div>
      </div>
    </div>
  )
}
