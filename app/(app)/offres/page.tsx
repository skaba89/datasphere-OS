'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, ExternalLink, Heart, Bot, Filter, Search, MapPin, Clock, Zap } from 'lucide-react'
import { cn, fmt } from '@/lib/utils'
import { useOffers } from '@/hooks/useOffers'
import type { LiveOffer } from '@/types'

function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }

export default function OffresPage() {
  const [skills, setSkills] = useState<string[]>([])
  const [view,   setView]   = useState<'cards' | 'list'>('cards')

  useEffect(() => {
    const s = load<{ cv?: { competences?: string[] } }>('datasphere_os_v1', {})
    const comps = (s.cv?.competences || ['Python', 'Snowflake', 'DBT', 'data engineer']).slice(0, 6)
    setSkills(comps)
    document.title = 'Offres live — DataSphere OS'
  }, [])

  const {
    filtered, loading, error, stats, sources,
    filters, setFilters, refresh, saveOffer, savedOffers
  } = useOffers(skills)

  const liveCount  = filtered.filter(o => o._live).length
  const avgTJM     = filtered.length ? Math.round(filtered.reduce((s,o) => s+(o.tjmMin+o.tjmMax)/2, 0) / filtered.length) : 0
  const plateformes = [...new Set(filtered.map(o => o.plateforme))]
  const topMatch   = filtered.filter(o => (o.score||0) >= 75).length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight">
            🔍 Offres de mission live
          </h1>
          <p className="text-sm text-ds-text3 mt-0.5">
            {loading
              ? `Chargement depuis ${Object.keys(stats).length || 7} sources…`
              : `${liveCount} offres · ${sources} sources · TJM moyen ${avgTJM}€/j`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(v => v === 'cards' ? 'list' : 'cards')} className="btn-secondary">
            {view === 'cards' ? '☰ Liste' : '⊞ Cartes'}
          </button>
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-1.5 btn-secondary">
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Offres trouvées', value: liveCount,               color: 'text-ds-blue2' },
          { label: 'Sources actives', value: sources || '…',          color: 'text-ds-teal' },
          { label: 'TJM moyen',       value: avgTJM ? avgTJM+'€/j':'…', color: 'text-ds-green' },
          { label: 'Score ≥ 75%',     value: topMatch,                color: 'text-ds-violet2' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sources status */}
      {!loading && Object.keys(stats).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats).map(([src, s]) => (
            <div key={src} className={cn(
              'flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border',
              s.ok && s.count > 0
                ? 'bg-ds-green/8 border-ds-green/20 text-ds-green'
                : s.count === 0
                  ? 'bg-ds-amber/8 border-ds-amber/20 text-ds-amber'
                  : 'bg-ds-rose/8 border-ds-rose/20 text-ds-rose/70'
            )}>
              <div className={cn('w-1.5 h-1.5 rounded-full',
                s.ok && s.count > 0 ? 'bg-ds-green' : s.count === 0 ? 'bg-ds-amber' : 'bg-ds-rose'
              )} />
              {src} {s.count > 0 ? `(${s.count})` : '(0)'}
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="card p-3">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text3" />
            <input className="inp pl-8 text-xs" placeholder="Titre, tech, entreprise…"
              value={filters.search} onChange={e => setFilters({ search: e.target.value })} />
          </div>
          <select className="inp w-36 text-xs" value={filters.modalite} onChange={e => setFilters({ modalite: e.target.value })}>
            <option value="">Modalité</option>
            {['Remote 100%', 'Hybride', 'On-site'].map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="inp w-32 text-xs" value={filters.tjmMin} onChange={e => setFilters({ tjmMin: Number(e.target.value) })}>
            <option value={0}>TJM min</option>
            {[400,500,600,700,800,900,1000].map(v => <option key={v} value={v}>{v}€+</option>)}
          </select>
          <select className="inp w-36 text-xs" value={filters.plateforme} onChange={e => setFilters({ plateforme: e.target.value })}>
            <option value="">Source</option>
            {plateformes.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="inp w-32 text-xs" value={filters.scoreMin} onChange={e => setFilters({ scoreMin: Number(e.target.value) })}>
            <option value={0}>Score min</option>
            {[50,60,70,80,90].map(v => <option key={v} value={v}>≥ {v}%</option>)}
          </select>
          {(filters.search || filters.modalite || filters.tjmMin || filters.plateforme || filters.scoreMin) && (
            <button onClick={() => setFilters({ search:'', modalite:'', tjmMin:0, plateforme:'', scoreMin:0 })}
              className="text-xs text-ds-rose hover:underline whitespace-nowrap">Réinitialiser</button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-ds-amber/8 border border-ds-amber/25 rounded-ds text-sm text-ds-amber">
          ⚠️ Certaines sources n'ont pas répondu — les offres disponibles sont affichées.
        </div>
      )}

      {/* Résultats */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_,i) => (
            <div key={i} className="h-36 rounded-ds skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ds-text3">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm mb-2">Aucune offre ne correspond à vos filtres.</p>
          <button onClick={() => setFilters({ search:'', modalite:'', tjmMin:0, plateforme:'', scoreMin:0 })}
            className="text-xs text-ds-blue2 hover:underline">Réinitialiser les filtres</button>
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.slice(0, 40).map(o => (
            <OfferCard key={o.id} offer={o} saved={savedOffers.includes(o.id)} onSave={() => saveOffer(o.id)} />
          ))}
          {filtered.length > 40 && (
            <div className="col-span-full text-center py-4 text-xs text-ds-text3">
              {filtered.length - 40} offres supplémentaires — affinez vos filtres pour les voir
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 60).map(o => (
            <OfferRow key={o.id} offer={o} saved={savedOffers.includes(o.id)} onSave={() => saveOffer(o.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function OfferCard({ offer: o, saved, onSave }: { offer: LiveOffer; saved: boolean; onSave: () => void }) {
  const sc  = o.score || 0
  const scC = sc >= 80 ? 'text-ds-green' : sc >= 65 ? 'text-ds-teal' : sc >= 50 ? 'text-ds-amber' : 'text-ds-text3'
  const scB = sc >= 80 ? 'bg-ds-green/10 border-ds-green/20' : sc >= 65 ? 'bg-ds-teal/10 border-ds-teal/20' : sc >= 50 ? 'bg-ds-amber/10 border-ds-amber/20' : 'bg-ds-bg3 border-ds-border'
  return (
    <div className={cn('card hover:-translate-y-px hover:shadow-md transition-all', o.urgence === 'Urgent' && 'border-ds-rose/25 bg-ds-rose/2')}>
      <div className="flex items-start gap-3">
        {/* Score */}
        <div className={cn('flex-shrink-0 w-12 h-12 rounded-[10px] border flex flex-col items-center justify-center', scB)}>
          <span className={cn('text-lg font-extrabold leading-none', scC)}>{sc}</span>
          <span className="text-[8px] text-ds-text3">match</span>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ds-text truncate">{o.titre}</h3>
              <p className="text-[11px] text-ds-text3 mt-0.5">{o.entreprise}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-sm font-extrabold text-ds-text">
                {fmt(o.tjmMin)}–{fmt(o.tjmMax)}€
                <span className="text-[10px] font-normal text-ds-text3">/j</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-ds-bg3 border border-ds-border text-ds-text3">
              <MapPin size={9} />{o.ville}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ds-bg3 border border-ds-border text-ds-text3">
              {o.modalite}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ds-bg3 border border-ds-border text-ds-text3">
              {o.duree}
            </span>
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-ds-bg4 border border-ds-border text-ds-text3">
              <Clock size={9} />{o.publiee}
            </span>
          </div>

          {o.tech && o.tech.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {o.tech.slice(0,5).map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-ds-blue/8 text-ds-blue2">{t}</span>
              ))}
            </div>
          )}

          {o.description && (
            <p className="text-[11px] text-ds-text3 mt-2 line-clamp-2">{o.description}</p>
          )}

          <div className="flex gap-2 mt-3 items-center">
            <span className="text-[10px] font-semibold text-ds-text3 flex items-center gap-1">
              <Zap size={9} className="text-ds-violet" />{o.plateforme}
            </span>
            <div className="flex-1" />
            {o._live && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ds-green/10 text-ds-green border border-ds-green/20">LIVE</span>
            )}
            <button onClick={onSave} className="p-1.5 text-ds-text3 hover:text-ds-rose transition-colors">
              <Heart size={13} className={cn(saved && 'fill-ds-rose text-ds-rose')} />
            </button>
            {o.url && (
              <a href={o.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-semibold text-ds-text2 px-2.5 py-1.5 rounded-[7px] bg-ds-bg3 border border-ds-border hover:bg-ds-bg4 transition-colors">
                <ExternalLink size={11} /> Voir
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OfferRow({ offer: o, saved, onSave }: { offer: LiveOffer; saved: boolean; onSave: () => void }) {
  const sc  = o.score || 0
  const scC = sc >= 80 ? 'text-ds-green' : sc >= 65 ? 'text-ds-teal' : 'text-ds-amber'
  return (
    <div className="card py-3 hover:border-ds-border2 transition-all">
      <div className="flex items-center gap-4">
        <span className={cn('text-base font-extrabold w-8 text-center flex-shrink-0', scC)}>{sc}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ds-text truncate">{o.titre}</span>
            {o._live && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ds-green/10 text-ds-green border border-ds-green/20 flex-shrink-0">LIVE</span>}
          </div>
          <div className="flex gap-2 text-[10px] text-ds-text3 mt-0.5 flex-wrap">
            <span>{o.entreprise}</span>
            <span>·</span>
            <span>{o.ville}</span>
            <span>·</span>
            <span>{o.modalite}</span>
            <span>·</span>
            <span>{o.plateforme}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-extrabold text-ds-text">{fmt(o.tjmMin)}–{fmt(o.tjmMax)}€/j</div>
            <div className="text-[10px] text-ds-text3">{o.duree}</div>
          </div>
          <button onClick={onSave} className="p-1.5 text-ds-text3 hover:text-ds-rose">
            <Heart size={13} className={cn(saved && 'fill-ds-rose text-ds-rose')} />
          </button>
          {o.url && (
            <a href={o.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-semibold text-ds-text2 px-2.5 py-1.5 rounded-[7px] bg-ds-bg3 border border-ds-border hover:bg-ds-bg4">
              <ExternalLink size={11} /> Voir
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
