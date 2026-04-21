'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Rocket, Receipt, Target, Bell,
  BarChart2, Users, Search, Bot, Sparkles,
  Calculator, BookOpen, ShieldCheck,
  Gem, ChevronLeft, ChevronRight, Settings,
  Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types'

const NAV_GROUPS = [
  {
    label: 'Activité',
    items: [
      { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
      { id: 'missions',    label: 'Missions',     icon: Rocket },
      { id: 'facturation', label: 'Factures',     icon: Receipt },
      { id: 'rappels',     label: 'Rappels',      icon: Bell },
      { id: 'okrs',        label: 'OKRs',         icon: Target },
    ],
  },
  {
    label: 'Prospection',
    items: [
      { id: 'offres',      label: 'Offres live',  icon: Search },
      { id: 'commercial',  label: 'CRM',          icon: Users },
      { id: 'agent',       label: 'Agent IA',     icon: Bot },
      { id: 'ia',          label: 'IA Studio',    icon: Sparkles },
    ],
  },
  {
    label: 'Outils',
    items: [
      { id: 'comptabilite',label: 'Comptabilité', icon: Calculator },
      { id: 'graphiques',  label: 'Graphiques',   icon: BarChart2 },
      { id: 'formation',   label: 'Formation',    icon: BookOpen },
      { id: 'audit',       label: 'Audit URL',    icon: ShieldCheck },
    ],
  },
]

const PLAN_LABELS: Record<Plan, string> = {
  free:       'Plan Free',
  pro:        'Pro ⚡',
  agency:     'Agency ✦',
  earlybird:  'Early Bird ⭐',
  superadmin: 'Admin 👑',
}

function load<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [plan,     setPlan]     = useState<Plan>('free')
  const [userName, setUserName] = useState('')
  const [overdue,  setOverdue]  = useState(0)
  const [rappels,  setRappels]  = useState(0)
  const [online,   setOnline]   = useState(true)

  // Extraire le segment actif depuis l'URL
  const activeId = pathname.replace(/^\//, '').split('/')[0] || 'dashboard'

  useEffect(() => {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    setPlan((s.plan as Plan) || 'free')
    setUserName(
      (s.cv as Record<string,string>)?.nom ||
      (s.authUser as Record<string,string>)?.email?.split('@')[0] ||
      ''
    )
    const today = new Date().toISOString().slice(0, 10)
    setOverdue(
      ((s.factures as {statut:string;date:string}[]) || []).filter(f =>
        f.statut !== 'Payée' && ((Date.now() - new Date(f.date).getTime()) / 86400000) > 30
      ).length
    )
    setRappels(
      ((s.rappels as {done:boolean;date:string}[]) || []).filter(r =>
        !r.done && r.date <= today
      ).length
    )
    if (window.innerWidth < 768) setCollapsed(true)
    setOnline(navigator.onLine)
    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Fermer le menu mobile au changement de route
  useEffect(() => { setMobileOpen(false) }, [pathname])

  function navigate(id: string) {
    router.push(`/${id}`)
    setMobileOpen(false)
  }

  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'DS'

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0 border-b border-ds-border">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-ds-blue to-ds-violet
          flex items-center justify-center text-white text-sm font-bold flex-shrink-0
          shadow-[0_4px_12px_rgba(91,127,255,.35)]">
          ◈
        </div>
        {!collapsed && (
          <div className="font-extrabold text-[15px] tracking-[-0.04em] text-ds-text">
            Data<span className="bg-gradient-to-r from-ds-blue2 to-ds-violet bg-clip-text text-transparent">Sphere</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="ml-auto text-ds-text3 hover:text-ds-text2 transition-colors hidden md:block"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <button onClick={() => setMobileOpen(false)} className="ml-auto text-ds-text3 md:hidden">
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pb-4 pt-2">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-4 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-ds-text3">
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const Icon     = item.icon
              const isActive = activeId === item.id
              const badge    = item.id === 'rappels'    ? rappels
                             : item.id === 'facturation' ? overdue
                             : 0
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={cn(
                    'relative flex items-center gap-2.5 w-full text-left text-[12.5px] font-medium',
                    'rounded-[8px] transition-all duration-100 mx-2 my-0.5',
                    collapsed ? 'px-2 py-2.5 w-[calc(100%-16px)] justify-center' : 'px-3 py-2 w-[calc(100%-16px)]',
                    isActive
                      ? 'bg-ds-blue/12 text-ds-blue2 font-semibold'
                      : 'text-ds-text2 hover:bg-ds-bg3 hover:text-ds-text',
                  )}
                >
                  {isActive && (
                    <span className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] bg-ds-blue rounded-r-full" />
                  )}
                  <Icon size={15} className="flex-shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && badge > 0 && (
                    <span className="bg-ds-rose text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        {/* Séparateur + Pricing */}
        <div className="h-px bg-ds-border mx-3 my-3" />
        <button
          onClick={() => navigate('pricing')}
          className={cn(
            'flex items-center gap-2.5 mx-2 my-0.5 rounded-[8px] transition-all',
            'text-[12.5px] font-medium text-ds-text2 hover:bg-ds-bg3 hover:text-ds-text',
            collapsed ? 'px-2 py-2.5 w-[calc(100%-16px)] justify-center' : 'px-3 py-2 w-[calc(100%-16px)]',
          )}
        >
          <Gem size={15} className="text-ds-violet flex-shrink-0" />
          {!collapsed && <span>Plans & Tarifs</span>}
        </button>
      </nav>

      {/* User footer */}
      <div className="border-t border-ds-border p-2 flex-shrink-0">
        <div className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-[8px]', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ds-blue to-ds-violet
            flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-ds-text truncate">
                {userName || 'Mon compte'}
              </div>
              <div className="text-[10px] text-ds-text3">{PLAN_LABELS[plan]}</div>
            </div>
          )}
          <div
            className={cn('w-[7px] h-[7px] rounded-full flex-shrink-0', online ? 'bg-ds-green' : 'bg-ds-amber')}
            title={online ? 'En ligne' : 'Hors-ligne'}
          />
        </div>
        {!collapsed && (
          <button
            onClick={() => navigate('settings')}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 mt-0.5 rounded-[8px]
              text-[11px] text-ds-text3 hover:text-ds-text2 hover:bg-ds-bg3 transition-colors"
          >
            <Settings size={11} />
            Paramètres
          </button>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-ds-bg">

      {/* Sidebar desktop */}
      <aside className={cn(
        'hidden md:flex flex-col h-full bg-ds-bg1 border-r border-ds-border flex-shrink-0 transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[220px]',
      )}>
        <SidebarContent />
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside className={cn(
        'md:hidden fixed left-0 top-0 h-full w-[260px] bg-ds-bg1 border-r border-ds-border',
        'flex flex-col z-50 transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <SidebarContent />
      </aside>

      {/* Contenu principal */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-13 flex items-center justify-between px-4 md:px-5
          bg-ds-bg1/95 backdrop-blur-xl border-b border-ds-border sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Burger mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-ds-text3 hover:text-ds-text2 transition-colors"
            >
              <Menu size={18} />
            </button>
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              plan === 'pro'       ? 'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20' :
              plan === 'earlybird' ? 'bg-ds-amber/10 text-ds-amber border-ds-amber/20' :
              'bg-ds-bg3 text-ds-text3 border-ds-border'
            )}>
              {PLAN_LABELS[plan]}
            </span>
            <div className={cn('w-1.5 h-1.5 rounded-full', online ? 'bg-ds-green' : 'bg-ds-amber')} />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-ds-text3 hidden md:block">
              {new Date().toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short' })}
            </div>
            <button onClick={() => navigate('settings')}
              className="h-8 w-8 flex items-center justify-center rounded-[8px] bg-ds-bg3 border border-ds-border text-ds-text3 hover:text-ds-text2 transition-all">
              <Settings size={13} />
            </button>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>

        {/* Nav mobile bottom */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30
          bg-ds-bg1/97 backdrop-blur-xl border-t border-ds-border
          flex items-stretch">
          {[
            { id: 'dashboard',   icon: '📊', label: 'Home' },
            { id: 'missions',    icon: '🚀', label: 'Missions' },
            { id: 'offres',      icon: '🔍', label: 'Offres' },
            { id: 'agent',       icon: '🤖', label: 'Agent' },
            { id: 'commercial',  icon: '💼', label: 'CRM' },
          ].map(t => (
            <button key={t.id} onClick={() => navigate(t.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-1 py-2 flex-1 border-none bg-transparent cursor-pointer transition-colors',
                activeId === t.id ? 'text-ds-blue2' : 'text-ds-text3'
              )}>
              <span className="text-base">{t.icon}</span>
              <span className="text-[9px] font-medium">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
