'use client'
// components/layout/Sidebar.tsx
// ═══════════════════════════════════════════════════
// Sidebar moderne — Navigation groupée, badges,
// user footer, indicateur online
// ═══════════════════════════════════════════════════
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Rocket, Receipt, Target, Bell,
  BarChart2, Users, Search, Globe, Bot, Sparkles,
  Briefcase, ShieldCheck, Calculator, BookOpen,
  Gem, ChevronLeft, ChevronRight, Settings,
} from 'lucide-react'
import type { TabId, NavGroup, Plan } from '@/types'
import { cn } from '@/lib/utils'

interface NavItem {
  id:      TabId
  label:   string
  icon:    React.ElementType
  badge?:  number
}

const NAV_GROUPS: (NavGroup & { items: NavItem[] })[] = [
  {
    label: 'Activité',
    tabs:  ['dashboard','missions','facturation','rappels','okrs'],
    items: [
      { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
      { id: 'missions',     label: 'Missions',     icon: Rocket },
      { id: 'facturation',  label: 'Factures',     icon: Receipt },
      { id: 'rappels',      label: 'Rappels',      icon: Bell },
      { id: 'okrs',         label: 'OKRs',         icon: Target },
    ],
  },
  {
    label: 'Prospection',
    tabs:  ['offres','commercial','agent','ia'],
    items: [
      { id: 'offres',       label: 'Offres live',  icon: Search },
      { id: 'commercial',   label: 'CRM',          icon: Users },
      { id: 'agent',        label: 'Agent IA',     icon: Bot },
      { id: 'ia',           label: 'IA Studio',    icon: Sparkles },
    ],
  },
  {
    label: 'Outils',
    tabs:  ['comptabilite','graphiques','formation','audit'],
    items: [
      { id: 'comptabilite', label: 'Comptabilité', icon: Calculator },
      { id: 'graphiques',   label: 'Graphiques',   icon: BarChart2 },
      { id: 'formation',    label: 'Formation',    icon: BookOpen },
      { id: 'audit',        label: 'Audit',        icon: ShieldCheck },
    ],
  },
]

interface SidebarProps {
  plan?:          Plan
  userName?:      string
  userEmail?:     string
  overdueCount?:  number
  rappelCount?:   number
  collapsed?:     boolean
  onCollapse?:    (v: boolean) => void
}

export function Sidebar({
  plan = 'free',
  userName,
  userEmail,
  overdueCount = 0,
  rappelCount  = 0,
  collapsed    = false,
  onCollapse,
}: SidebarProps) {
  const router   = usePathname()
  const nav      = useRouter()
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    window.addEventListener('online',  () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
  }, [])

  const currentTab = router.replace('/', '') as TabId || 'dashboard'

  const planLabels: Record<Plan, string> = {
    free:       'Plan Free',
    pro:        'Plan Pro ⚡',
    agency:     'Agency ✦',
    earlybird:  'Early Bird ⭐',
    superadmin: 'Admin 👑',
  }

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'DS'

  return (
    <aside className={cn(
      'flex flex-col h-full bg-ds-bg1 border-r border-ds-border transition-all duration-250',
      collapsed ? 'w-[60px]' : 'w-[220px]',
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0">
        <div className="w-[30px] h-[30px] rounded-ds-sm bg-gradient-to-br from-ds-blue to-ds-violet
          flex items-center justify-center text-white text-sm font-bold flex-shrink-0
          shadow-[0_4px_12px_rgba(91,127,255,.35)]">
          ◈
        </div>
        {!collapsed && (
          <div className="font-extrabold text-[15px] tracking-[-0.04em] text-ds-text">
            Data<span className="bg-gradient-to-r from-ds-blue2 to-ds-violet
              bg-clip-text text-transparent">Sphere</span>
          </div>
        )}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="ml-auto text-ds-text3 hover:text-ds-text2 transition-colors"
          aria-label={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
        >
          {collapsed
            ? <ChevronRight size={14} />
            : <ChevronLeft  size={14} />
          }
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden pb-2" aria-label="Navigation principale">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[.08em] text-ds-text3">
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const Icon    = item.icon
              const isActive = currentTab === item.id
              const badge    = item.id === 'rappels'   ? rappelCount
                             : item.id === 'facturation' ? overdueCount
                             : 0

              return (
                <button
                  key={item.id}
                  onClick={() => nav.push(`/${item.id}`)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-2.5 w-full text-left text-[12px] font-medium',
                    'rounded-ds-sm transition-all duration-120',
                    collapsed ? 'mx-1 px-2 py-2.5 w-[calc(100%-8px)] justify-center' : 'mx-2 px-3 py-2 w-[calc(100%-16px)]',
                    isActive
                      ? 'bg-[rgba(91,127,255,.12)] text-ds-blue2 font-semibold'
                      : 'text-ds-text2 hover:bg-ds-bg3 hover:text-ds-text',
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute left-[-8px] top-1/2 -translate-y-1/2
                      w-[3px] h-[18px] bg-ds-blue rounded-r-[3px]" />
                  )}
                  <Icon size={15} className="flex-shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && badge > 0 && (
                    <span className="bg-ds-rose text-white text-[9px] font-bold
                      min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </button>
              )
            })}
            <div className="h-px bg-ds-border mx-3 my-1.5" />
          </div>
        ))}

        {/* Pricing */}
        <button
          onClick={() => nav.push('/pricing')}
          className={cn(
            'flex items-center gap-2.5 w-[calc(100%-16px)] mx-2 px-3 py-2 rounded-ds-sm',
            'text-[12px] font-medium text-ds-text2 hover:bg-ds-bg3 hover:text-ds-text transition-all',
            collapsed && 'justify-center w-[calc(100%-8px)] mx-1 px-2',
          )}
        >
          <Gem size={15} className="flex-shrink-0 text-ds-violet" />
          {!collapsed && <span>Plans & Tarifs</span>}
        </button>
      </nav>

      {/* User Footer */}
      <div className="border-t border-ds-border p-2 flex-shrink-0">
        <button
          onClick={() => nav.push('/auth')}
          className={cn(
            'flex items-center gap-2.5 w-full rounded-ds-sm px-2.5 py-2',
            'hover:bg-ds-bg3 transition-colors text-left',
            collapsed && 'justify-center px-2',
          )}
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ds-blue to-ds-violet
            flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-ds-text truncate">
                {userName || 'Mon compte'}
              </div>
              <div className="text-[10px] text-ds-text3">
                {planLabels[plan]}
              </div>
            </div>
          )}

          {/* Online indicator */}
          <div
            className={cn(
              'w-[7px] h-[7px] rounded-full flex-shrink-0 transition-colors',
              online ? 'bg-ds-green' : 'bg-ds-amber',
            )}
            title={online ? 'En ligne' : 'Hors-ligne'}
          />
        </button>

        {/* Settings */}
        {!collapsed && (
          <button
            onClick={() => nav.push('/settings')}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 mt-0.5 rounded-ds-sm
              text-[11px] text-ds-text3 hover:text-ds-text2 hover:bg-ds-bg3 transition-colors"
          >
            <Settings size={12} />
            Paramètres
          </button>
        )}
      </div>
    </aside>
  )
}
