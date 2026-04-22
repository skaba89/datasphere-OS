'use client'
import { useState, useEffect, useRef } from 'react'
import { RefreshCw, ExternalLink, Heart, Search, MapPin, Zap, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn, fmt } from '@/lib/utils'
import { useOffers } from '@/hooks/useOffers'
import type { LiveOffer } from '@/types'

function load<T>(k: string, d: T): T {
  try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d }
  catch { return d }
}

export default function OffresPage() {
  const [skills,   setSkills]   = useState<string[]>([])
  const [view,     setView]     = useState<'cards' | 'list'>('cards')
  const [expanded, setExpanded] = useState<string | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    document.title = 'Offres live — DataSphere OS'
    const s = load<{ cv?: { competences?: string[] } }>('datasphere_os_v1', {})
    const comps = (s.cv?.competences || []).slice(0, 6)
    setSkills(comps.length ? comps : ['data', 'python', 'sql', 'engineer'])
  }, [])

  const { filtered, loading, error, stats, sources, filters, setFilters, refresh, saveOffer, savedOffers } = useOffers(skills)

  const liveCount  = filtered.filter(o => o._live).length
  const avgTJM     = filtered.length ? Math.round(filtered.reduce((s,o) => s+(o.tjmMin+o.tjmMax)/2, 0) / filtered.length) : 0
  const plateformes = [...new Set(filtered.map(o => o.plateforme))]
  const topMatch   = filtered.filter(o => (o.score||0) >= 75).length
  const hasResults = filtered.length > 0

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2">
            🔍 Offres live
          </h1>
          <p className="text-sm text-ds-text3 mt-0.5">
            {loading
              ? <span className="flex items-center gap-1.5"><RefreshCw size={11} className="animate-spin" /> Chargement depuis {Object.keys(stats).length || 6} sources…</span>
              : `${liveCount} offres · ${sources} sources actives · TJM moyen ${avgTJM || '—'}€/j`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(v => v === 'cards' ? 'list' : 'cards')}
            className="btn-secondary text-xs">{view === 'cards' ? '☰ Liste' : '⊞ Cartes'}</button>
          <button onClick={refresh} disabled={loading}
            className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Offres trouvées', value: loading ? '…' : liveCount,                color: 'text-ds-blue2' },
          { label: 'Sources actives', value: loading ? '…' : sources,                  color: 'text-ds-teal' },
          { label: 'TJM moyen',       value: loading ? '…' : (avgTJM ? avgTJM+'€/j' : '—'), color: 'text-ds-green' },
          { label: 'Score ≥ 75%',     value: loading ? '…' : topMatch,                 color: 'text-ds-violet2' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sources pills */}
      {!loading && Object.keys(stats).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(stats).map(([src, s]) => (
            <span key={src} className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full border',
              s.ok && s.count > 0
                ? 'bg-ds-green/8 border-ds-green/20 text-ds-green'
                : 'bg-ds-amber/8 border-ds-amber/20 text-ds-amber'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', s.ok && s.count > 0 ? 'bg-ds-green' : 'bg-ds-amber')} />
              {src} {s.count > 0 && <span className="opacity-70">({s.count})</span>}
            </span>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center p-3 card">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text3" />
          <input className="inp pl-8 text-xs py-1.5" placeholder="Titre, tech, entreprise…"
            value={filters.search} onChange={e => setFilters({ search: e.target.value })} />
        </div>
        <select className="inp w-32 text-xs py-1.5" value={filters.modalite} onChange={e => setFilters({ modalite: e.target.value })}>
          <option value="">Modalité</option>
          {['Remote 100%', 'Hybride', 'On-site'].map(m => <option key={m}>{m}</option>)}
        </select>
        <select className="inp w-28 text-xs py-1.5" value={filters.tjmMin} onChange={e => setFilters({ tjmMin: Number(e.target.value) })}>
          <option value={0}>TJM min</option>
          {[400,500,600,700,800,900,1000].map(v => <option key={v} value={v}>{v}€+</option>)}
        </select>
        <select className="inp w-32 text-xs py-1.5" value={filters.plateforme} onChange={e => setFilters({ plateforme: e.target.value })}>
          <option value="">Source</option>
          {plateformes.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="inp w-28 text-xs py-1.5" value={filters.scoreMin} onChange={e => setFilters({ scoreMin: Number(e.target.value) })}>
          <option value={0}>Score min</option>
          {[50,60,70,80,90].map(v => <option key={v} value={v}>≥{v}%</option>)}
        </select>
        {(filters.search||filters.modalite||filters.tjmMin||filters.plateforme||filters.scoreMin) > 0 && (
          <button onClick={() => setFilters({ search:'', modalite:'', tjmMin:0, plateforme:'', scoreMin:0 })}
            className="text-[10px] text-ds-rose hover:underline whitespace-nowrap">Réinitialiser</button>
        )}
      </div>

      {/* Erreur */}
      {error && !hasResults && (
        <div className="flex items-center gap-3 px-4 py-3 bg-ds-amber/8 border border-ds-amber/25 rounded-ds text-sm text-ds-amber">
          <AlertTriangle size={14} /> Certaines sources n'ont pas répondu — les offres disponibles sont affichées.
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className={cn('gap-3', view === 'cards' ? 'grid grid-cols-1 lg:grid-cols-2' : 'space-y-2')}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={cn('rounded-ds skeleton', view === 'cards' ? 'h-44' : 'h-16')} />
          ))}
        </div>
      )}

      {/* Pas de résultats */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-ds-text3">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm mb-3">
            {hasResults === false && Object.keys(stats).length === 0
              ? 'Chargement des offres… Si aucune offre n\'apparaît, actualisez.'
              : 'Aucune offre ne correspond à vos filtres.'}
          </p>
          <button onClick={() => setFilters({ search:'', modalite:'', tjmMin:0, plateforme:'', scoreMin:0 })}
            className="text-xs text-ds-blue2 hover:underline">Réinitialiser les filtres</button>
        </div>
      )}

      {/* Résultats */}
      {!loading && filtered.length > 0 && (
        <>
          {view === 'cards' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.slice(0, 40).map(o => (
                <OfferCard key={o.id} offer={o}
                  saved={savedOffers.includes(o.id)}
                  expanded={expanded === o.id}
                  onExpand={() => setExpanded(expanded === o.id ? null : o.id)}
                  onSave={() => saveOffer(o.id)} />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.slice(0, 60).map(o => (
                <OfferRow key={o.id} offer={o} saved={savedOffers.includes(o.id)} onSave={() => saveOffer(o.id)} />
              ))}
            </div>
          )}
          {filtered.length > 40 && (
            <p className="text-center text-xs text-ds-text3 py-3">
              +{filtered.length - 40} offres — affinez vos filtres pour les voir
            </p>
          )}
        </>
      )}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const col = score >= 80 ? 'text-ds-green bg-ds-green/10 border-ds-green/20'
            : score >= 65 ? 'text-ds-teal bg-ds-teal/10 border-ds-teal/20'
            : score >= 50 ? 'text-ds-amber bg-ds-amber/10 border-ds-amber/20'
            :               'text-ds-text3 bg-ds-bg3 border-ds-border'
  return (
    <div className={cn('flex-shrink-0 w-11 h-11 rounded-[10px] border flex flex-col items-center justify-center', col)}>
      <span className="text-base font-extrabold leading-none">{score}</span>
      <span className="text-[8px] opacity-70 mt-0.5">match</span>
    </div>
  )
}

function OfferCard({ offer: o, saved, expanded, onExpand, onSave }: {
  offer: LiveOffer; saved: boolean; expanded: boolean
  onExpand: () => void; onSave: () => void
}) {
  return (
    <div className={cn('card transition-all hover:-translate-y-px hover:shadow-md cursor-pointer',
      o.urgence === 'Urgent' && 'border-ds-rose/20')}>
      <div className="flex items-start gap-3" onClick={onExpand}>
        <ScoreBadge score={o.score || 0} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ds-text truncate leading-snug">{o.titre}</h3>
              <p className="text-[11px] text-ds-text3">{o.entreprise}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-sm font-extrabold text-ds-text whitespace-nowrap">
                {o.tjmMin === o.tjmMax ? fmt(o.tjmMin) : `${fmt(o.tjmMin)}–${fmt(o.tjmMax)}`}€
                <span className="text-[10px] font-normal text-ds-text3">/j</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-ds-bg3 border border-ds-border text-ds-text3">
              <MapPin size={8} />{o.ville}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ds-bg3 border border-ds-border text-ds-text3">{o.modalite}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ds-bg3 border border-ds-border text-ds-text3">{o.duree}</span>
            {o._live && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ds-green/10 text-ds-green border border-ds-green/20 font-semibold">LIVE</span>}
          </div>

          {o.tech && o.tech.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {o.tech.slice(0,5).map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-ds-blue/8 text-ds-blue2 font-medium">{t}</span>
              ))}
            </div>
          )}

          {expanded && o.description && (
            <p className="text-[11px] text-ds-text3 mt-2 mb-2 leading-relaxed border-t border-ds-border pt-2">{o.description.slice(0,600)}</p>
          )}

          <div className="flex gap-2 items-center mt-2">
            <span className="text-[10px] text-ds-text3 flex items-center gap-1"><Zap size={8} className="text-ds-violet" />{o.plateforme}</span>
            <span className="text-[10px] text-ds-text3">{o.publiee}</span>
            <div className="flex-1" />
            <button onClick={e => { e.stopPropagation(); onSave() }}
              className="p-1 text-ds-text3 hover:text-ds-rose transition-colors">
              <Heart size={13} className={cn(saved && 'fill-ds-rose text-ds-rose')} />
            </button>
            {o.url && (
              <a href={o.url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] font-semibold text-ds-text2 px-2.5 py-1.5 rounded-[7px] bg-ds-bg3 border border-ds-border hover:bg-ds-bg4 transition-colors">
                <ExternalLink size={10} /> Voir
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OfferRow({ offer: o, saved, onSave }: { offer: LiveOffer; saved: boolean; onSave: () => void }) {
  const sc = o.score || 0
  const scC = sc >= 80 ? 'text-ds-green' : sc >= 65 ? 'text-ds-teal' : 'text-ds-amber'
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-ds-bg2 border border-ds-border hover:border-ds-border2 transition-all">
      <span className={cn('text-sm font-extrabold w-8 text-center flex-shrink-0 tabular-nums', scC)}>{sc}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-ds-text truncate">{o.titre}</span>
          {o._live && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ds-green/10 text-ds-green border border-ds-green/20 flex-shrink-0">LIVE</span>}
        </div>
        <div className="flex gap-1.5 text-[10px] text-ds-text3 mt-0.5 flex-wrap">
          <span>{o.entreprise}</span><span>·</span>
          <span>{o.ville}</span><span>·</span>
          <span>{o.modalite}</span><span>·</span>
          <span className="text-ds-violet">{o.plateforme}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:block text-right">
          <div className="text-sm font-extrabold text-ds-text whitespace-nowrap">
            {fmt(o.tjmMin)}–{fmt(o.tjmMax)}€/j
          </div>
          <div className="text-[10px] text-ds-text3">{o.duree}</div>
        </div>
        <button onClick={onSave} className="p-1.5 text-ds-text3 hover:text-ds-rose transition-colors">
          <Heart size={13} className={cn(saved && 'fill-ds-rose text-ds-rose')} />
        </button>
        {o.url && (
          <a href={o.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-semibold text-ds-text2 px-2.5 py-1.5 rounded-[7px] bg-ds-bg3 border border-ds-border hover:bg-ds-bg4 transition-colors">
            <ExternalLink size={10} /> Voir
          </a>
        )}
      </div>
    </div>
  )
}
